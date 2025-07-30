const apiKey = "52a00342238189a79c137a328380b9d0";

function shuffle() {
  const boxes = document.querySelectorAll('.search-box');
  const sampleNames = ["Tom Hanks", "Viola Davis", "Brad Pitt", "Greta Gerwig", "Christopher Nolan"];
  boxes.forEach((box, i) => {
    box.value = sampleNames[Math.floor(Math.random() * sampleNames.length)];
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

  // Placeholder: in a real setup, you'd fetch TMDb data and compare credits here
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
      <h3>${result.title} (${result.year})</h3>
      <p>⭐ ${result.rating} / 10</p>
      <ul>${result.roles.map(role => `<li>${role}</li>`).join("")}</ul>
    `;
    box.appendChild(card);
  });
} 
