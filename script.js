const apiKey = "52a00342238189a79c137a328380b9d0";

async function getPersonIdByName(name) {
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  return data.results[0]?.id || null;
}

async function getCredits(personId, includeTV = false) {
  const movieCredits = await fetch(`https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}`);
  const movieData = await movieCredits.json();
  let credits = movieData.cast || [];

  if (includeTV) {
    const tvCredits = await fetch(`https://api.themoviedb.org/3/person/${personId}/tv_credits?api_key=${apiKey}`);
    const tvData = await tvCredits.json();
    credits = credits.concat(tvData.cast || []);
  }

  return credits;
}

function shuffle() {
  const boxes = document.querySelectorAll('.search-box');
  const sampleNames = [
    "Tom Hanks", "Denzel Washington", "Scarlett Johansson", "Leonardo DiCaprio",
    "Meryl Streep", "Robert Downey Jr.", "Zendaya", "Ryan Gosling",
    "Natalie Portman", "Samuel L. Jackson", "Anne Hathaway", "Morgan Freeman"
  ];
  const usedIndexes = new Set();
  boxes.forEach(box => {
    let idx;
    do {
      idx = Math.floor(Math.random() * sampleNames.length);
    } while (usedIndexes.has(idx) && usedIndexes.size < sampleNames.length);
    usedIndexes.add(idx);
    box.value = sampleNames[idx];
  });
  clearResults();
  document.querySelectorAll(".search-box").forEach(input => {
    input.removeEventListener("input", handleAutocomplete);
    input.addEventListener("input", () => handleAutocomplete(input));
  });
}

function clearResults() {
  const box = document.getElementById("resultsBox");
  box.innerHTML = `<p class="placeholder-text">Results will appear here.</p>`;
}

async function search() {
  const names = Array.from(document.querySelectorAll('.search-box'))
    .map(input => input.value.trim())
    .filter(name => name);

  const includeTV = document.getElementById("includeTV")?.checked;

  if (names.length < 2) {
    alert("Please enter at least two names to compare.");
    return;
  }

  document.getElementById("resultsBox").innerHTML = `<p>Searching for shared projects between ${names.join(" & ")}...</p>`;

  try {
    const personCredits = {};
    for (const name of names) {
      const id = await getPersonIdByName(name);
      if (!id) throw new Error(`Could not find person: ${name}`);
      personCredits[name] = await getCredits(id, includeTV);
    }

    const sharedMovies = findSharedMovies(personCredits);
    renderResults(sharedMovies, personCredits);
  } catch (error) {
    document.getElementById("resultsBox").innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

function findSharedMovies(personCredits) {
  const movieMap = new Map();
  for (const [name, credits] of Object.entries(personCredits)) {
    for (const movie of credits) {
      if (!movieMap.has(movie.id)) {
        movieMap.set(movie.id, { ...movie, roles: {} });
      }
      movieMap.get(movie.id).roles[name] = movie.character || "(Unknown Role)";
    }
  }

  return Array.from(movieMap.values()).filter(movie => {
    return Object.keys(movie.roles).length === Object.keys(personCredits).length;
  });
}

function renderResults(movies, personCredits) {
  const box = document.getElementById("resultsBox");
  box.innerHTML = "";

  if (movies.length === 0) {
    box.innerHTML = `<p>No shared movie or TV credits found.</p>`;
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title || movie.name}" class="poster" />
      <h3 class="card-title">${movie.title || movie.name} <span class="year">(${(movie.release_date || movie.first_air_date || "N/A").slice(0, 4)})</span></h3>
      <ul class="role-list">
        ${Object.entries(movie.roles).map(([name, role]) => `<li><strong>${name}</strong> as ${role}</li>`).join("")}
      </ul>
      <p class="rating">⭐ Rating: ${movie.vote_average?.toFixed(1) || "N/A"}</p>
    `;
    box.appendChild(card);
  });
}

async function handleAutocomplete(input) {
  const listBox = input.nextElementSibling;
  const query = input.value.trim();
  if (!query) return listBox.innerHTML = "";

  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const topResults = data.results.slice(0, 10);

  listBox.innerHTML = topResults.map(person => `
    <div class="suggestion-item" onclick="selectSuggestion(this, '${person.name}')">
      <img src="https://image.tmdb.org/t/p/w45${person.profile_path}" alt="${person.name}" />
      <span>${person.name}</span>
    </div>
  `).join("");
}

function selectSuggestion(div, name) {
  const input = div.closest(".input-group").querySelector(".search-box");
  input.value = name;
  div.parentElement.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  function initializeAutocomplete() {
    document.querySelectorAll(".search-box").forEach(input => {
      input.removeEventListener("input", handleAutocomplete);
      input.addEventListener("input", () => handleAutocomplete(input));
    });
  }

  initializeAutocomplete();

  // If new input fields are dynamically added later, call initializeAutocomplete() again
  window.initializeAutocomplete = initializeAutocomplete;
});
