// What Else - Real TMDb Integration
const apiKey = "52a00342238189a79c137a328380b9d0";

let pinnedActorNames = new Set();

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchBtn").addEventListener("click", findSharedProjects);
  document.getElementById("clearBtn").addEventListener("click", clearAll);
  addActorInput();
  addActorInput();
});

function addActorInput() {
  const group = document.createElement("div");
  group.className = "actor-input-group";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "actor-input";
  input.placeholder = "Enter Actor Name";

  group.appendChild(input);
  document.getElementById("actorInputs").appendChild(group);
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

  const actorIds = await Promise.all(actorNames.map(name => getPersonIdByName(name)));
  const creditsList = await Promise.all(actorIds.map(id => getMovieCredits(id)));

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
    card.innerHTML = `
      <h3>${movieDetails.title} (${movieDetails.release_date?.slice(0, 4)})</h3>
      <p>⭐ ${movieDetails.vote_average.toFixed(1)} / 10</p>
      <p>${movieDetails.overview}</p>
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
