// What Else - Real TMDb Integration (with Debug Logging)
const apiKey = "52a00342238189a79c137a328380b9d0";

let pinnedActorNames = new Set();
let debounceTimer = null;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchBtn").addEventListener("click", findSharedProjects);
  document.getElementById("clearBtn").addEventListener("click", clearAll);
  addActorInput();
  addActorInput();
});

function addActorInput() {
  const group = document.createElement("div");
  group.className = "actor-input-group";

  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "actor-input";
  input.placeholder = "Enter Actor Name";

  const suggestionsDiv = document.createElement("div");
  suggestionsDiv.className = "suggestions-dropdown";

  // Add event listeners for auto-suggest
  input.addEventListener("input", (e) => handleInputChange(e, suggestionsDiv));
  input.addEventListener("focus", (e) => handleInputChange(e, suggestionsDiv));
  input.addEventListener("blur", () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => suggestionsDiv.style.display = "none", 200);
  });

  inputContainer.appendChild(input);
  inputContainer.appendChild(suggestionsDiv);
  group.appendChild(inputContainer);
  document.getElementById("actorInputs").appendChild(group);
}

async function handleInputChange(event, suggestionsDiv) {
  const query = event.target.value.trim();
  
  if (query.length < 2) {
    suggestionsDiv.style.display = "none";
    return;
  }

  // Debounce API calls
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const suggestions = await getActorSuggestions(query);
    displaySuggestions(suggestions, suggestionsDiv, event.target);
  }, 300);
}

async function getActorSuggestions(query) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results.slice(0, 5); // Top 5 suggestions
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

function displaySuggestions(suggestions, suggestionsDiv, input) {
  if (suggestions.length === 0) {
    suggestionsDiv.style.display = "none";
    return;
  }

  suggestionsDiv.innerHTML = "";
  suggestions.forEach(actor => {
    const suggestionItem = document.createElement("div");
    suggestionItem.className = "suggestion-item";
    
    const photoUrl = actor.profile_path 
      ? `https://image.tmdb.org/t/p/w92${actor.profile_path}`
      : "https://via.placeholder.com/92x138/cccccc/666666?text=No+Photo";
    
    suggestionItem.innerHTML = `
      <img src="${photoUrl}" alt="${actor.name}" class="suggestion-photo" />
      <div class="suggestion-info">
        <div class="suggestion-name">${actor.name}</div>
        <div class="suggestion-known-for">${actor.known_for_department || "Actor"}</div>
      </div>
    `;
    
    suggestionItem.addEventListener("click", () => {
      input.value = actor.name;
      suggestionsDiv.style.display = "none";
    });
    
    suggestionsDiv.appendChild(suggestionItem);
  });
  
  suggestionsDiv.style.display = "block";
}

function clearAll() {
  document.getElementById("actorInputs").innerHTML = "";
  document.getElementById("results").innerHTML = "";
  addActorInput();
  addActorInput();
}

async function findSharedProjects() {
  const actorNames = Array.from(document.querySelectorAll('.actor-input'))
    .map(input => input.value.trim())
    .filter(name => name);

  if (actorNames.length < 2) {
    alert("Please enter at least two names.");
    return;
  }

  const actorIds = [];

  for (const name of actorNames) {
    const id = await getPersonIdByName(name);
    if (!id) {
      alert(`Could not find an exact match for "${name}". Try checking the spelling.`);
      console.warn(`No TMDb match for: ${name}`);
      return;
    }
    console.log(`Found TMDb ID for "${name}":`, id);
    actorIds.push(id);
  }

  const creditsList = await Promise.all(actorIds.map(id => getMovieCredits(id)));
  console.log("Fetched credits for all actors:", creditsList);

  const sharedMovies = getSharedMovies(creditsList);
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  if (sharedMovies.length === 0) {
    resultsContainer.innerHTML = '<p>No shared projects found.</p>';
    return;
  }

  for (const movie of sharedMovies) {
    const movieDetails = await getMovieDetails(movie.id);
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const posterUrl = movieDetails.poster_path 
      ? `https://image.tmdb.org/t/p/w300${movieDetails.poster_path}`
      : "https://via.placeholder.com/300x450/cccccc/666666?text=No+Poster";
    
    card.innerHTML = `
      <div class="movie-poster">
        <img src="${posterUrl}" alt="${movieDetails.title} poster" />
      </div>
      <div class="movie-details">
        <h3>${movieDetails.title} (${movieDetails.release_date?.slice(0, 4)})</h3>
        <p class="rating">⭐ ${movieDetails.vote_average.toFixed(1)} / 10</p>
        <p class="overview">${movieDetails.overview}</p>
      </div>
    `;
    resultsContainer.appendChild(card);
  }
}

async function getPersonIdByName(name) {
  const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}`);
  const data = await res.json();
  return data.results[0]?.id;
}

async function getMovieCredits(personId) {
  const res = await fetch(`https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}`);
  const data = await res.json();
  return data.cast;
}

function getSharedMovies(allCredits) {
  const movieMap = new Map();
  allCredits.forEach((credits, index) => {
    const ids = new Set(credits.map(c => c.id));
    if (index === 0) {
      ids.forEach(id => movieMap.set(id, 1));
    } else {
      for (const id of movieMap.keys()) {
        if (!ids.has(id)) {
          movieMap.delete(id);
        }
      }
    }
  });
  return Array.from(movieMap.keys()).map(id => allCredits[0].find(c => c.id === id));
}

async function getMovieDetails(id) {
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`);
  return await res.json();
}
