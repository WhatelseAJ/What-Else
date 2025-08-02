// Full JavaScript for What Else App with UI & Search Functions + TMDb Links
const apiKey = "52a00342238189a79c137a328380b9d0";
let currentMode = 'actors';
let debounceTimer;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modeSelect").addEventListener("change", switchMode);
  document.getElementById("searchBtn").addEventListener("click", handleSearch);
  document.getElementById("shuffleBtn").addEventListener("click", shuffleSearch);
  document.getElementById("addBtn").addEventListener("click", addInput);
  document.getElementById("clearBtn").addEventListener("click", clearAll);
  switchMode();
});

function switchMode() {
  currentMode = document.getElementById("modeSelect").value;
  document.getElementById("inputSection").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("comparisonHeader").innerHTML = "";
  addInput();
  addInput();
}

function addInput() {
  const wrapper = document.createElement("div");
  wrapper.className = "input-wrapper";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = currentMode === 'actors' ? "Enter actor or director name" : "Enter movie title";
  input.className = "entry-input";
  input.setAttribute("autocomplete", "off");

  const suggestionBox = document.createElement("div");
  suggestionBox.className = "autocomplete-suggestions";

  input.addEventListener("input", () => handleAutocomplete(input, suggestionBox));
  input.addEventListener("blur", () => setTimeout(() => suggestionBox.innerHTML = "", 200));

  wrapper.appendChild(input);
  wrapper.appendChild(suggestionBox);
  document.getElementById("inputSection").appendChild(wrapper);
}

async function handleAutocomplete(input, suggestionBox) {
  const query = input.value.trim();
  if (!query) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const type = currentMode === 'actors' ? 'person' : 'movie';
    const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const suggestions = data.results.slice(0, 6);

    suggestionBox.innerHTML = "";
    suggestions.forEach(s => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const img = s.profile_path || s.poster_path ? `<img src='https://image.tmdb.org/t/p/w92${s.profile_path || s.poster_path}' alt='thumb' />` : "";
      const label = s.title || s.name;
      div.innerHTML = `${img}<span>${label}</span>`;
      div.addEventListener("click", () => {
        input.value = label;
        suggestionBox.innerHTML = "";
      });
      suggestionBox.appendChild(div);
    });
  }, 300);
}

async function handleSearch() {
  const entries = Array.from(document.querySelectorAll(".entry-input")).map(i => i.value.trim()).filter(Boolean);
  if (entries.length < 2) return alert("Enter at least two entries.");
  document.getElementById("results").innerHTML = "<p>Loading...</p>";

  if (currentMode === 'actors') {
    await compareActors(entries);
  } else {
    await compareFilms(entries);
  }
}

async function getIdByName(name, type) {
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results[0]?.id;
}

async function getCredits(id, type) {
  const url = type === 'person'
    ? `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${apiKey}`
    : `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return type === 'person' ? data.cast : data.cast.concat(data.crew);
}

async function compareActors(names) {
  const ids = await Promise.all(names.map(name => getIdByName(name, 'person')));
  const creditsList = await Promise.all(ids.map(id => getCredits(id, 'person')));
  const movieMap = new Map();

  creditsList.forEach((credits, i) => {
    credits.forEach(c => {
      if (!movieMap.has(c.id)) movieMap.set(c.id, []);
      movieMap.get(c.id)[i] = c.character || c.job || "?";
    });
  });

  const shared = Array.from(movieMap.entries()).filter(([_, roles]) => roles.filter(Boolean).length === names.length);
  displayMovies(shared, names);
  displayHeaders(names, 'person');
}

async function compareFilms(titles) {
  const ids = await Promise.all(titles.map(title => getIdByName(title, 'movie')));
  const creditList = await Promise.all(ids.map(id => getCredits(id, 'movie')));
  const peopleMap = new Map();

  creditList.forEach((people, i) => {
    people.forEach(p => {
      if (!peopleMap.has(p.id)) peopleMap.set(p.id, []);
      peopleMap.get(p.id)[i] = p.character || p.job || "?";
    });
  });

  const shared = Array.from(peopleMap.entries()).filter(([_, roles]) => roles.filter(Boolean).length === titles.length);
  displayPeople(shared, titles);
  displayHeaders(titles, 'movie');
}

async function displayMovies(entries, names) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  for (const [id, roles] of entries) {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`);
    const movie = await res.json();
    const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : "";
    const card = document.createElement("div");
    card.className = "result-card";
    const rolesHTML = names.map((name, i) => `<p><strong>${name}</strong>: ${roles[i]}</p>`).join("");

    card.innerHTML = `
      <a href="https://www.themoviedb.org/movie/${movie.id}" target="_blank">
        <img src="${poster}" alt="${movie.title}" />
        <h3>${movie.title} (${movie.release_date?.slice(0, 4)})</h3>
        <p>⭐ ${movie.vote_average?.toFixed(1)} / 10</p>
      </a>
      ${rolesHTML}
    `;
    container.appendChild(card);
  }
}

async function displayPeople(entries, titles) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  for (const [id, roles] of entries) {
    const res = await fetch(`https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}`);
    const person = await res.json();
    const photo = person.profile_path ? `https://image.tmdb.org/t/p/w300${person.profile_path}` : "";
    const card = document.createElement("div");
    card.className = "result-card";
    const rolesHTML = titles.map((title, i) => `<p><strong>${title}</strong>: ${roles[i]}</p>`).join("");

    card.innerHTML = `
      <a href="https://www.themoviedb.org/person/${person.id}" target="_blank">
        <img src="${photo}" alt="${person.name}" />
        <h3>${person.name}</h3>
      </a>
      ${rolesHTML}
    `;
    container.appendChild(card);
  }
}

function displayHeaders(items, type) {
  const container = document.getElementById("comparisonHeader");
  container.innerHTML = "";
  items.forEach(async item => {
    const id = await getIdByName(item, type);
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const imgPath = data.profile_path || data.poster_path;
    const imgUrl = imgPath ? `https://image.tmdb.org/t/p/w92${imgPath}` : "";
    const div = document.createElement("div");
    div.innerHTML = `<img src="${imgUrl}" style="width:64px;height:auto;border-radius:50%"><p>${item}</p>`;
    container.appendChild(div);
  });
}

function shuffleSearch() {
  const actorPool = [
    "Tom Hanks", "Scarlett Johansson", "Brad Pitt", "Robert Downey Jr.",
    "Natalie Portman", "Samuel L. Jackson", "Florence Pugh", "Jake Gyllenhaal",
    "Leonardo DiCaprio", "Jennifer Lawrence", "Christian Bale", "Zendaya",
    "Matt Damon", "Emma Stone", "Morgan Freeman", "Viola Davis"
  ];

  const filmPool = [
    "The Matrix", "Inception", "Forrest Gump", "La La Land",
    "Mad Max: Fury Road", "Parasite", "Dune", "The Dark Knight",
    "The Social Network", "Pulp Fiction", "The Grand Budapest Hotel",
    "No Country for Old Men", "Arrival", "Everything Everywhere All At Once",
    "Top Gun: Maverick", "Her", "Whiplash", "Interstellar"
  ];

  const pool = currentMode === 'actors' ? actorPool : filmPool;
  const [first, second] = getTwoRandomItems(pool);

  document.getElementById("inputSection").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("comparisonHeader").innerHTML = "";

  [first, second].forEach(name => {
    const wrapper = document.createElement("div");
    wrapper.className = "input-wrapper";
    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.className = "entry-input";
    input.setAttribute("autocomplete", "off");

    const suggestionBox = document.createElement("div");
    suggestionBox.className = "autocomplete-suggestions";
    wrapper.appendChild(input);
    wrapper.appendChild(suggestionBox);
    document.getElementById("inputSection").appendChild(wrapper);
  });

  handleSearch();
}

function getTwoRandomItems(arr) {
  const copy = [...arr];
  const first = copy.splice(Math.floor(Math.random() * copy.length), 1)[0];
  const second = copy[Math.floor(Math.random() * copy.length)];
  return [first, second];
}

function clearAll() {
  document.getElementById("inputSection").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("comparisonHeader").innerHTML = "";
  addInput();
  addInput();
}
