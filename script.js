const apiKey = "52a00342238189a79c137a328380b9d0";

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
}

function clearResults() {
  const box = document.getElementById("resultsBox");
  box.innerHTML = `<p class="placeholder-text">Results will appear here.</p>`;
}

function search() {
  const names = Array.from(document.querySelectorAll('.search-box'))
    .map(input => input.value.trim())
    .filter(name => name);

  if (names.length < 2) {
    alert("Please enter at least two names to compare.");
    return;
  }

  document.getElementById("resultsBox").innerHTML = `<p>Searching for shared projects between ${names.join(" & ")}...</p>`;

  setTimeout(() => {
    renderMockResults(names);
  }, 1200);
}

function renderMockResults(names) {
  const box = document.getElementById("resultsBox");
  box.innerHTML = "";
  const fakeResults = [
    {
      title: "Imaginary Crossover Film",
      year: "2021",
      rating: "7.9",
      poster: "https://via.placeholder.com/150x225?text=Movie+Poster",
      roles: names.map(name => `${name} as Cool Character`)
    },
    {
      title: "Another Collab",
      year: "2018",
      rating: "8.2",
      poster: "https://via.placeholder.com/150x225?text=Movie+Poster",
      roles: names.map(name => `${name} as Legendary Role`)
    }
  ];
  fakeResults.forEach(result => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <img src="${result.poster}" alt="${result.title}" class="poster" />
      <h3 class="card-title">${result.title} <span class="year">(${result.year})</span></h3>
      <p class="rating">⭐ ${result.rating} / 10</p>
      <ul class="role-list">${result.roles.map(role => `<li>${role}</li>`).join("")}</ul>
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
  document.querySelectorAll(".search-box").forEach(input => {
    const suggestionBox = input.nextElementSibling;
    input.addEventListener("input", () => handleAutocomplete(input));
  });
});
