// What Else? — JS (Actors + optional TV)
// TMDb API
const apiKey = "52a00342238189a79c137a328380b9d0";
let currentMode = "actors";
let includeTV = true; // default ON
let debounceTimer;

window.addEventListener("DOMContentLoaded", () => {
  // Wire controls
  qs("#modeSelect").addEventListener("change", switchMode);
  qs("#searchBtn").addEventListener("click", handleSearch);
  qs("#shuffleBtn").addEventListener("click", shuffleSearch);
  qs("#addBtn").addEventListener("click", addInput);
  qs("#clearBtn").addEventListener("click", clearAll);

  // Inject a lightweight "Include TV" checkbox into .controls (no HTML changes needed)
  injectIncludeTvCheckbox();

  // Start
  switchMode();
});

/* ------------------ UI Helpers ------------------ */
function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return [...parent.querySelectorAll(sel)]; }
function clearNode(node) { node && (node.innerHTML = ""); }
function showLoading() { qs("#results").innerHTML = `<p>Loading...</p>`; }
function showEmpty(msg = "No overlaps found. Try adjusting your inputs or use Shuffle.") {
  qs("#results").innerHTML = `<p>${msg}</p>`;
}
function injectIncludeTvCheckbox() {
  const controls = qs(".controls");
  if (!controls || qs("#includeTv")) return;

  const label = document.createElement("label");
  label.style.marginLeft = "0.75rem";
  label.style.display = "inline-flex";
  label.style.alignItems = "center";
  label.style.gap = "0.35rem";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = "includeTv";
  input.checked = true;

  input.addEventListener("change", () => {
    includeTV = input.checked;
    // If user toggles while in actors mode, we can optionally re-run search
    // (keeping it simple: don’t auto-run; they can click Search again)
  });

  label.appendChild(input);
  label.appendChild(document.createTextNode("Include TV"));
  controls.appendChild(label);
}

/* ------------------ Mode & Inputs ------------------ */
function switchMode() {
  currentMode = qs("#modeSelect").value; // 'actors' or 'films'
  clearAll(); // will also add two fresh inputs
}

function addInput(prefill = "") {
  const wrap = document.createElement("div");
  wrap.className = "input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = currentMode === "actors"
    ? "Enter actor or director name"
    : "Enter movie title";
  input.className = "entry-input";
  input.autocomplete = "off";
  if (prefill) input.value = prefill;

  const box = document.createElement("div");
  box.className = "autocomplete-suggestions";

  input.addEventListener("input", () => handleAutocomplete(input, box));
  input.addEventListener("keydown", (e) => {
    // Enter selects top suggestion if open
    if (e.key === "Enter" && box.firstElementChild) {
      const top = box.firstElementChild;
      input.value = top?.dataset?.label || input.value;
      box.innerHTML = "";
      e.preventDefault();
    }
  });
  input.addEventListener("blur", () => setTimeout(() => (box.innerHTML = ""), 180));

  wrap.appendChild(input);
  wrap.appendChild(box);
  qs("#inputSection").appendChild(wrap);
}

/* ------------------ Autocomplete ------------------ */
async function handleAutocomplete(input, box) {
  const query = input.value.trim();
  if (!query) { box.innerHTML = ""; return; }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const type = currentMode === "actors" ? "person" : "movie";
      const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await (await fetch(url)).json();
      const results = (data?.results || []).slice(0, 8);
      box.innerHTML = "";

      results.forEach((s) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.dataset.label = s.title || s.name;

        const imgPath = s.profile_path || s.poster_path;
        const img = imgPath
          ? `<img src="https://image.tmdb.org/t/p/w92${imgPath}" alt="">`
          : "";

        const sub = currentMode === "actors"
          ? (s.known_for_department ? ` · ${s.known_for_department}` : "")
          : (s.release_date ? ` · ${s.release_date.slice(0, 4)}` : "");

        div.innerHTML = `${img}<span>${div.dataset.label}${sub}</span>`;
        div.addEventListener("mousedown", () => {
          input.value = div.dataset.label;
          box.innerHTML = "";
        });
        box.appendChild(div);
      });
    } catch {
      box.innerHTML = "";
    }
  }, 250);
}

/* ------------------ Search Flow ------------------ */
async function handleSearch() {
  const entries = qsa(".entry-input")
    .map((i) => i.value.trim())
    .filter(Boolean);

  if (entries.length < 2) {
    alert("Enter at least two entries.");
    return;
  }

  showLoading();

  try {
    if (currentMode === "actors") {
      await compareActors(entries);
    } else {
      await compareFilms(entries);
    }
  } catch {
    showEmpty("Something went wrong. Please try again.");
  }
}

/* ------------------ TMDb Helpers ------------------ */
async function getIdByName(name, type) {
  // type: 'person' or 'movie'
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(name)}&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0]?.id || null;
}

/**
 * getCredits
 * - For 'person': returns normalized credits for MOVIES and, if includeTV, TV.
 *   Each item: { media_type:'movie'|'tv', id:number, year:number, _role:string }
 * - For 'movie': returns combined cast+crew, normalized to { id, _role }
 */
async function getCredits(id, type, opts = { includeTV: true }) {
  if (!id) return [];

  if (type === "person") {
    // PERSON: merge movie_credits and (optionally) tv_credits, keep roles + year
    const [movieData, tvData] = await Promise.all([
      fetchJSON(`https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${apiKey}`),
      opts.includeTV
        ? fetchJSON(`https://api.themoviedb.org/3/person/${id}/tv_credits?api_key=${apiKey}`)
        : null
    ]);

    const movies = normalizePersonMovieCredits(movieData);
    const tv = opts.includeTV ? normalizePersonTvCredits(tvData) : [];
    return movies.concat(tv);
  }

  // MOVIE: we only compare films in "films" mode, so TV is irrelevant here.
  const data = await fetchJSON(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`);
  const merged = []
    .concat((data?.cast || []).map(p => ({ id: p.id, _role: p.character || "?" })))
    .concat((data?.crew || []).map(p => ({ id: p.id, _role: p.job || "?" })));
  return merged;
}

function normalizePersonMovieCredits(movieData) {
  const cast = (movieData?.cast || []).map(c => ({
    media_type: "movie",
    id: c.id,
    _role: c.character || "?",
    year: yearFromDate(c.release_date)
  }));
  const crew = (movieData?.crew || []).map(c => ({
    media_type: "movie",
    id: c.id,
    _role: c.job || "?",
    year: yearFromDate(c.release_date)
  }));
  return cast.concat(crew);
}

function normalizePersonTvCredits(tvData) {
  const cast = (tvData?.cast || []).map(c => ({
    media_type: "tv",
    id: c.id,
    _role: c.character || "?",
    year: yearFromDate(c.first_air_date)
  }));
  const crew = (tvData?.crew || []).map(c => ({
    media_type: "tv",
    id: c.id,
    _role: c.job || "?",
    year: yearFromDate(c.first_air_date)
  }));
  return cast.concat(crew);
}

function yearFromDate(d) {
  return d && d.length >= 4 ? Number(d.slice(0, 4)) : 0;
}

/* ------------------ Compare: Actors ------------------ */
// cache for year by key "media:id"
const titleYearsCache = {};

async function compareActors(names) {
  const ids = await Promise.all(names.map((n) => getIdByName(n, "person")));
  const creditsList = await Promise.all(
    ids.map((id) => getCredits(id, "person", { includeTV }))
  );

  // Map "media:id" -> role array aligned with names[]
  const map = new Map();

  creditsList.forEach((credits, i) => {
    credits.forEach((c) => {
      const key = `${c.media_type}:${c.id}`;
      if (!map.has(key)) map.set(key, Array(names.length).fill(null));
      const arr = map.get(key);
      arr[i] = c._role || "?";

      // record year for sorting
      if (!titleYearsCache[key]) titleYearsCache[key] = Number(c.year || 0);
    });
  });

  // keep only where all names have a role
  const shared = [...map.entries()].filter(([, roles]) =>
    roles.every((r) => r && String(r).trim().length > 0)
  );

  // Sort by year desc (newest → oldest)
  shared.sort((a, b) => (titleYearsCache[b[0]] || 0) - (titleYearsCache[a[0]] || 0));

  await displayTitles(shared, names);   // supports movie + TV
  displayHeaders(names, "person");
}

/* ------------------ Compare: Films ------------------ */
async function compareFilms(titles) {
  const ids = await Promise.all(titles.map((t) => getIdByName(t, "movie")));
  const peopleLists = await Promise.all(ids.map((id) => getCredits(id, "movie")));

  // Map personId -> role array aligned with titles[]
  const map = new Map();
  peopleLists.forEach((people, i) => {
    people.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, Array(titles.length).fill(null));
      const arr = map.get(p.id);
      arr[i] = p._role || "?";
    });
  });

  const shared = [...map.entries()].filter(([, roles]) =>
    roles.every((r) => r && String(r).trim().length > 0)
  );

  // We’ll sort by popularity later during displayPeople (via cache)
  await displayPeople(shared, titles);
  displayHeaders(titles, "movie");
}

/* ------------------ Display (Movies + TV) ------------------ */
const personPopularityCache = {};

async function displayTitles(entries, names) {
  const container = qs("#results");
  clearNode(container);

  if (!entries.length) { showEmpty(); return; }

  for (const [key, roles] of entries) {
    const [media, idStr] = key.split(":");
    const id = Number(idStr);

    // fetch details based on media type
    const detail = await fetchJSON(
      media === "tv"
        ? `https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`
    );
    if (!detail) continue;

    const posterPath = detail.poster_path;
    const poster = posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}` : "";
    const title = media === "tv" ? (detail.name || "Untitled") : (detail.title || "Untitled");
    const year = media === "tv" ? yearFromDate(detail.first_air_date) : yearFromDate(detail.release_date);
    const score = Number(detail.vote_average || 0).toFixed(1);

    // Label TV vs Movie in the heading
    const mediaTag = media === "tv" ? `<span style="font-size:0.8rem;opacity:.9">[TV]</span> ` : "";

    const card = document.createElement("div");
    card.className = "result-card";

    const rolesHTML = names
      .map((name, i) => `<p><strong>${escapeHTML(name)}</strong>: ${escapeHTML(roles[i] || "?")}</p>`)
      .join("");

    card.innerHTML = `
      <a href="https://www.themoviedb.org/${media}/${id}" target="_blank" rel="noopener">
        ${poster ? `<img src="${poster}" alt="${escapeHTML(title)} poster" />` : ""}
        <h3>${mediaTag}${escapeHTML(title)} (${year || "—"})</h3>
        <p>⭐ ${score} / 10</p>
      </a>
      ${rolesHTML}
    `;
    container.appendChild(card);
  }
}

async function displayPeople(entries, titles) {
  const container = qs("#results");
  clearNode(container);

  if (!entries.length) { showEmpty(); return; }

  // sort by popularity (fetching person details to cache popularity)
  const withPop = [];
  for (const [id, roles] of entries) {
    const person = await fetchJSON(`https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}`);
    if (!person) continue;
    personPopularityCache[id] = Number(person.popularity || 0);
    withPop.push({ person, roles });
  }
  withPop.sort((a, b) => (b.person.popularity || 0) - (a.person.popularity || 0));

  for (const { person, roles } of withPop) {
    const photo = person.profile_path ? `https://image.tmdb.org/t/p/w300${person.profile_path}` : "";

    const card = document.createElement("div");
    card.className = "result-card";

    const rolesHTML = titles
      .map((title, i) => `<p><strong>${escapeHTML(title)}</strong>: ${escapeHTML(roles[i] || "?")}</p>`)
      .join("");

    card.innerHTML = `
      <a href="https://www.themoviedb.org/person/${person.id}" target="_blank" rel="noopener">
        ${photo ? `<img src="${photo}" alt="${escapeHTML(person.name)} headshot" />` : ""}
        <h3>${escapeHTML(person.name)}</h3>
      </a>
      ${rolesHTML}
    `;
    container.appendChild(card);
  }
}

function displayHeaders(items, type) {
  const container = qs("#comparisonHeader");
  clearNode(container);

  items.forEach(async (label) => {
    const id = await getIdByName(label, type);
    if (!id) return;

    const data = await fetchJSON(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`);
    if (!data) return;

    const imgPath = data.profile_path || data.poster_path;
    const imgUrl = imgPath ? `https://image.tmdb.org/t/p/w92${imgPath}` : "";
    const div = document.createElement("div");
    div.innerHTML = `
      ${imgUrl ? `<img src="${imgUrl}" alt="" />` : ""}
      <p>${escapeHTML(label)}</p>
    `;
    container.appendChild(div);
  });
}

/* ------------------ Shuffle / Clear ------------------ */
function shuffleSearch() {
  const actorPool = [
    "Tom Hanks","Scarlett Johansson","Brad Pitt","Robert Downey Jr.",
    "Natalie Portman","Samuel L. Jackson","Florence Pugh","Jake Gyllenhaal",
    "Leonardo DiCaprio","Jennifer Lawrence","Christian Bale","Zendaya",
    "Matt Damon","Emma Stone","Morgan Freeman","Viola Davis"
  ];

  const filmPool = [
    "The Matrix","Inception","Forrest Gump","La La Land",
    "Mad Max: Fury Road","Parasite","Dune","The Dark Knight",
    "The Social Network","Pulp Fiction","The Grand Budapest Hotel",
    "No Country for Old Men","Arrival","Everything Everywhere All At Once",
    "Top Gun: Maverick","Her","Whiplash","Interstellar"
  ];

  const pool = currentMode === "actors" ? actorPool : filmPool;
  const [first, second] = getTwoRandomItems(pool);

  clearAll(false); // do not auto-add inputs yet
  addInput(first);
  addInput(second);
  handleSearch();
}

function getTwoRandomItems(arr) {
  const copy = [...arr];
  const first = copy.splice(Math.floor(Math.random() * copy.length), 1)[0];
  const second = copy[Math.floor(Math.random() * copy.length)];
  return [first, second];
}

function clearAll(addTwo = true) {
  clearNode(qs("#inputSection"));
  clearNode(qs("#results"));
  clearNode(qs("#comparisonHeader"));
  if (addTwo) { addInput(); addInput(); }
}

/* ------------------ Utils ------------------ */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
