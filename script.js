/**
 * What Else? — Movie & Actor Match Finder
 * Powered by TMDb API
 */

const apiKey = "52a00342238189a79c137a328380b9d0";
let currentMode = "actors";
let includeTV = false; // TV results now OFF by default
const autocompleteTimers = new WeakMap();
const responseCache = new Map();
let activeSearchId = 0;
const CACHE_TTL = 5 * 60 * 1000;

// --- Initialization ---

window.addEventListener("DOMContentLoaded", () => {
  qs("#modeSelect").addEventListener("change", switchMode);
  qs("#searchBtn").addEventListener("click", handleSearch);
  qs("#shuffleBtn").addEventListener("click", shuffleSearch);
  qs("#addBtn").addEventListener("click", () => {
    addInput();
    resetSuccessState();
  });
  qs("#clearBtn").addEventListener("click", () => clearAll());

  qs("#includeTv").addEventListener("change", () => {
    includeTV = qs("#includeTv").checked;
    const entries = qsa(".entry-input").map(i => i.value.trim()).filter(Boolean);
    if (entries.length >= 2) handleSearch();
  });
  setupNavigation();
  switchMode();
});


// --- App navigation and discovery views ---
const loadedViews = new Set();

function setupNavigation() {
  qsa("[data-view]").forEach(button => button.addEventListener("click", () => navigateTo(button.dataset.view)));
  qsa("[data-go]").forEach(button => button.addEventListener("click", () => navigateTo(button.dataset.go)));
  window.addEventListener("hashchange", () => {
    const requested = location.hash.replace("#", "");
    if (["home", "compare", "people", "explore"].includes(requested)) navigateTo(requested, false);
  });
  const initial = location.hash.replace("#", "");
  navigateTo(["home", "compare", "people", "explore"].includes(initial) ? initial : "home", false);
}

function navigateTo(view, updateHash = true) {
  const target = qs("#view-" + view);
  if (!target) return;
  qsa(".view").forEach(section => section.classList.toggle("active", section === target));
  qsa(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));
  if (updateHash && location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
  if (view === "people" && !loadedViews.has(view)) loadDiscovery("person", "peopleGrid");
  if (view === "explore" && !loadedViews.has(view)) loadDiscovery("trending/all/week", "exploreGrid");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadDiscovery(endpoint, containerId) {
  const container = qs("#" + containerId);
  if (!container) return;
  container.innerHTML = '<p class="loading-note">Finding something worth a look…</p>';
  const url = endpoint === "person"
    ? `https://api.themoviedb.org/3/person/popular?api_key=${apiKey}&language=en-US&page=1`
    : `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`;
  const data = await fetchJSON(url);
  if (!data || !Array.isArray(data.results)) {
    container.innerHTML = '<p class="loading-note">Could not load this collection. Please try again.</p>';
    return;
  }
  const items = data.results.slice(0, 18);
  container.innerHTML = "";
  items.forEach(item => {
    const isPerson = endpoint === "person";
    const name = isPerson ? item.name : (item.title || item.name);
    const imagePath = isPerson ? item.profile_path : item.poster_path;
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const kind = isPerson ? (item.known_for_department || "Person") : (item.media_type === "tv" ? "TV" : "Film");
    const card = document.createElement("a");
    card.className = "discovery-card";
    card.href = isPerson ? `https://www.themoviedb.org/person/${item.id}` : `https://www.themoviedb.org/${item.media_type}/${item.id}`;
    card.target = "_blank";
    card.rel = "noopener";
    const image = imagePath ? `https://image.tmdb.org/t/p/w342${imagePath}` : "";
    card.innerHTML = `<img src="${image}" alt="" loading="lazy"><div><strong>${escapeHTML(name || "Untitled")}</strong><span>${escapeHTML(kind)}${year ? " · " + year : ""}</span></div>`;
    container.appendChild(card);
  });
  loadedViews.add(containerId === "peopleGrid" ? "people" : "explore");
}
\n/* ------------------ UI Helpers ------------------ */

function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return [...parent.querySelectorAll(sel)]; }
function clearNode(node) { if (node) node.innerHTML = ""; }

function showLoading() { 
  qs("#results").innerHTML = `<div style="grid-column: 1/-1; padding: 2rem;"><p>Searching connections...</p></div>`; 
}

function showEmpty(msg = "No overlaps found. Try different names or use Shuffle!") {
  qs("#results").innerHTML = `<div style="grid-column: 1/-1; padding: 2rem;"><p>${msg}</p></div>`;
}

function resetSuccessState() {
  qsa(".entry-input").forEach(i => i.classList.remove("success-glow"));
}

/**
 * Injects the TV toggle (Off by default)
 */
function injectIncludeTvCheckbox() {
  const controls = qs(".controls");
  if (!controls || qs("#includeTv")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "tv-toggle-wrapper";
  wrapper.style.cssText = "margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; opacity: 0.9;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = "includeTv";
  input.checked = false; // UI matches the default state

  const label = document.createElement("label");
  label.htmlFor = "includeTv";
  label.textContent = "Include TV Credits";
  label.style.cursor = "pointer";

  input.addEventListener("change", () => { 
    includeTV = input.checked; 
    // If a search was already performed, refresh automatically
    const entries = qsa(".entry-input").map(i => i.value.trim()).filter(Boolean);
    if (entries.length >= 2) handleSearch();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(label);
  controls.appendChild(wrapper);
}

/* ------------------ Input Management ------------------ */

function switchMode() {
  currentMode = qs("#modeSelect").value; 
  clearAll(); 
}

function addInput(prefill = "") {
  const wrap = document.createElement("div");
  wrap.className = "input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = currentMode === "actors" ? "e.g. Cillian Murphy" : "e.g. Inception";
  input.className = "entry-input";
  input.autocomplete = "off";
  if (prefill) input.value = prefill;

  // Small X button on the far right inside the box
  const clearBtn = document.createElement("button");
  clearBtn.className = "clear-input-btn";
  clearBtn.innerHTML = "&times;";
  clearBtn.title = "Clear this field";
  clearBtn.addEventListener("click", () => {
    input.value = "";
    input.classList.remove("success-glow");
    input.focus();
  });

  const box = document.createElement("div");
  box.className = "autocomplete-suggestions";

  input.addEventListener("input", () => {
    input.classList.remove("success-glow");
    handleAutocomplete(input, box);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (box.firstElementChild) {
        input.value = box.firstElementChild.dataset.label;
        clearNode(box);
      } else {
        handleSearch();
      }
      e.preventDefault();
    }
  });

  input.addEventListener("blur", () => setTimeout(() => clearNode(box), 200));

  wrap.appendChild(input);
  wrap.appendChild(clearBtn);
  wrap.appendChild(box);
  qs("#inputSection").appendChild(wrap);
}

/* ------------------ Search & Logic ------------------ */

async function handleSearch() {
  const searchId = ++activeSearchId;
  const entries = qsa(".entry-input")
    .map(i => i.value.trim())
    .filter(Boolean);

  if (entries.length < 2) {
    alert("Please enter at least two names/titles to find a connection.");
    return;
  }

  resetSuccessState();
  showLoading();
  clearNode(qs("#comparisonHeader"));

  try {
    if (currentMode === "actors") {
      await compareActors(entries, searchId);
    } else {
      await compareFilms(entries, searchId);
    }
  } catch (err) {
    console.error(err);
    if (searchId === activeSearchId) showEmpty("Connection error. Please check your internet or try again.");
  }
}

function highlightWinners() {
  qsa(".entry-input").forEach(input => {
    if (input.value.trim() !== "") {
      input.classList.add("success-glow");
    }
  });
}

async function getIdByName(name, type) {
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(name)}&include_adult=false`;
  const data = await fetchJSON(url);
  return data?.results?.[0]?.id || null;
}

async function getCredits(id, type, opts = { includeTV: false }) {
  if (!id) return [];

  if (type === "person") {
    const [movieData, tvData] = await Promise.all([
      fetchJSON(`https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${apiKey}`),
      opts.includeTV ? fetchJSON(`https://api.themoviedb.org/3/person/${id}/tv_credits?api_key=${apiKey}`) : null
    ]);

    const movies = normalizeCredits(movieData, "movie");
    const tv = opts.includeTV ? normalizeCredits(tvData, "tv") : [];
    return [...movies, ...tv];
  }

  const data = await fetchJSON(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`);
  return [
    ...(data?.cast || []).map(p => ({ id: p.id, _role: p.character || "Actor" })),
    ...(data?.crew || []).map(p => ({ id: p.id, _role: p.job || "Crew" }))
  ];
}

function normalizeCredits(data, mediaType) {
  if (!data) return [];
  const cast = (data.cast || []).map(c => ({
    media_type: mediaType,
    id: c.id,
    _role: c.character || "Actor",
    year: yearFromDate(mediaType === "movie" ? c.release_date : c.first_air_date)
  }));
  const crew = (data.crew || []).map(c => ({
    media_type: mediaType,
    id: c.id,
    _role: c.job || "Crew",
    year: yearFromDate(mediaType === "movie" ? c.release_date : c.first_air_date)
  }));
  return [...cast, ...crew];
}

function yearFromDate(d) {
  return d && d.length >= 4 ? Number(d.slice(0, 4)) : 0;
}

async function compareActors(names, searchId) {
  const ids = await Promise.all(names.map(n => getIdByName(n, "person")));
  if (searchId !== activeSearchId) return;
  const validIds = ids.filter(id => id !== null);

  if (validIds.length < names.length) { 
    showEmpty("Could not find one or more actors. Please check spelling."); 
    return; 
  }

  const creditsList = await Promise.all(validIds.map(id => getCredits(id, "person", { includeTV })));
  if (searchId !== activeSearchId) return;
  const map = new Map();
  const yearCache = {};

  creditsList.forEach((credits, i) => {
    credits.forEach(c => {
      const key = `${c.media_type}:${c.id}`;
      if (!map.has(key)) map.set(key, Array(names.length).fill(null));
      map.get(key)[i] = c._role;
      yearCache[key] = c.year;
    });
  });

  const shared = [...map.entries()].filter(([, roles]) => roles.every(r => r !== null));
  shared.sort((a, b) => (yearCache[b[0]] || 0) - (yearCache[a[0]] || 0));

  if (shared.length > 0) {
    highlightWinners();
    await displayTitles(shared, names, searchId);
  } else {
    showEmpty();
  }
  if (searchId === activeSearchId) displayHeaders(names, "person", searchId);
}

async function compareFilms(titles, searchId) {
  const ids = await Promise.all(titles.map(t => getIdByName(t, "movie")));
  if (searchId !== activeSearchId) return;
  const validIds = ids.filter(id => id !== null);

  if (validIds.length < titles.length) { 
    showEmpty("Could not find one or more films."); 
    return; 
  }

  const peopleLists = await Promise.all(validIds.map(id => getCredits(id, "movie")));
  if (searchId !== activeSearchId) return;
  const map = new Map();

  peopleLists.forEach((people, i) => {
    people.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, Array(titles.length).fill(null));
      map.get(p.id)[i] = p._role;
    });
  });

  const shared = [...map.entries()].filter(([, roles]) => roles.every(r => r !== null));

  if (shared.length > 0) {
    highlightWinners();
    await displayPeople(shared, titles, searchId);
  } else {
    showEmpty();
  }
  if (searchId === activeSearchId) displayHeaders(titles, "movie", searchId);
}

/* ------------------ Display Results ------------------ */

async function displayTitles(entries, names, searchId) {
  const container = qs("#results");
  clearNode(container);

  const details = await Promise.all(entries.map(([key]) => {
    const [media, id] = key.split(":");
    return fetchJSON(`https://api.themoviedb.org/3/${media}/${id}?api_key=${apiKey}`);
  }));

  if (searchId !== activeSearchId) return;
  details.forEach((detail, idx) => {
    if (!detail) return;
    const [key, roles] = entries[idx];
    const [media, id] = key.split(":");
    const card = document.createElement("div");
    card.className = "result-card";
    const title = detail.title || detail.name;
    const year = yearFromDate(detail.release_date || detail.first_air_date);

    card.innerHTML = `
      <a href="https://www.themoviedb.org/${media}/${id}" target="_blank" rel="noopener" style="text-decoration:none; color:inherit;">
        <img src="${detail.poster_path ? 'https://image.tmdb.org/t/p/w300' + detail.poster_path : ''}" alt="${title}">
        <h3>${media.toUpperCase()}: ${escapeHTML(title)} (${year || 'N/A'})</h3>
      </a>
      <div class="roles-list" style="margin-top: 10px; font-size: 0.9rem;">
        ${names.map((name, i) => `<p><strong>${escapeHTML(name)}:</strong> ${escapeHTML(roles[i])}</p>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

async function displayPeople(entries, titles, searchId) {
  const container = qs("#results");
  clearNode(container);

  const peopleWithDetails = await Promise.all(
    entries.slice(0, 24).map(async ([id, roles]) => {
      const p = await fetchJSON(`https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}`);
      return { p, roles };
    })
  );

  if (searchId !== activeSearchId) return;
  peopleWithDetails
    .filter(item => item.p)
    .sort((a, b) => b.p.popularity - a.p.popularity)
    .forEach(({ p, roles }) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <a href="https://www.themoviedb.org/person/${p.id}" target="_blank" rel="noopener" style="text-decoration:none; color:inherit;">
          <img src="${p.profile_path ? 'https://image.tmdb.org/t/p/w300' + p.profile_path : ''}" alt="${p.name}">
          <h3>${escapeHTML(p.name)}</h3>
        </a>
        <div class="roles-list" style="margin-top: 10px; font-size: 0.9rem;">
          ${titles.map((t, i) => `<p><strong>${escapeHTML(t)}:</strong> ${escapeHTML(roles[i])}</p>`).join('')}
        </div>
      `;
      container.appendChild(card);
    });
}

function displayHeaders(items, type, searchId) {
  const container = qs("#comparisonHeader");
  clearNode(container);

  items.forEach(async (label) => {
    const id = await getIdByName(label, type);
    if (!id) return;
    const data = await fetchJSON(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`);
    if (!data || searchId !== activeSearchId) return;

    const imgPath = data.profile_path || data.poster_path;
    const linkPath = type === "person" ? "person" : "movie";

    const div = document.createElement("div");
    div.style.textAlign = "center";
    div.innerHTML = `
      <a href="https://www.themoviedb.org/${linkPath}/${id}" target="_blank" rel="noopener">
        <img src="${imgPath ? 'https://image.tmdb.org/t/p/w92' + imgPath : ''}" 
             alt="${label}" 
             style="width:60px; height:60px; object-fit:cover; border-radius:50%; border:2px solid white; cursor:pointer;">
      </a>
      <p style="font-size:0.75rem; margin-top:5px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(label)}</p>
    `;
    container.appendChild(div);
  });
}

/* ------------------ Autocomplete & Utility ------------------ */

async function handleAutocomplete(input, box) {
  const query = input.value.trim();
  if (!query) { clearNode(box); return; }

  clearTimeout(autocompleteTimers.get(input));
  const requestQuery = query;
  const requestMode = currentMode;
  const timer = setTimeout(async () => {
    try {
      const type = requestMode === "actors" ? "person" : "movie";
      const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await fetchJSON(url);
      if (input.value.trim() !== requestQuery || currentMode !== requestMode) return;
      const results = (data?.results || []).slice(0, 6);
      clearNode(box);

      results.forEach((s) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.dataset.label = s.title || s.name;

        const imgPath = s.profile_path || s.poster_path;
        const img = imgPath 
          ? `<img src="https://image.tmdb.org/t/p/w92${imgPath}" alt="">` 
          : `<div style="width:40px;height:55px;background:#ddd;border-radius:4px"></div>`;

        const info = requestMode === "actors"
          ? (s.known_for_department || "Acting")
          : (s.release_date ? s.release_date.slice(0, 4) : "N/A");

        div.innerHTML = `${img}<span>${div.dataset.label}<br><small style="opacity:0.6">${info}</small></span>`;
        div.addEventListener("mousedown", () => {
          input.value = div.dataset.label;
          clearNode(box);
        });
        box.appendChild(div);
      });
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  }, 300);
  autocompleteTimers.set(input, timer);
}

function shuffleSearch() {
  const actorPool = ["Tom Hanks", "Cillian Murphy", "Zendaya", "Leonardo DiCaprio", "Florence Pugh", "Brad Pitt", "Viola Davis", "Matt Damon", "Meryl Streep"];
  const filmPool = ["Inception", "The Dark Knight", "Pulp Fiction", "The Matrix", "Interstellar", "Dune", "Gladiator", "The Godfather"];
  const pool = currentMode === "actors" ? actorPool : filmPool;

  const shuffled = pool.sort(() => 0.5 - Math.random());
  clearAll(false);
  addInput(shuffled[0]);
  addInput(shuffled[1]);
  handleSearch();
}

function clearAll(addTwo = true) {
  activeSearchId++;
  clearNode(qs("#inputSection"));
  clearNode(qs("#results"));
  clearNode(qs("#comparisonHeader"));
  if (addTwo) { addInput(); addInput(); }
}

async function fetchJSON(url) {
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("TMDb request failed:", res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    responseCache.set(url, { data, time: Date.now() });
    if (responseCache.size > 250) responseCache.delete(responseCache.keys().next().value);
    return data;
  } catch (error) {
    console.error("TMDb network error:", error);
    return null;
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
