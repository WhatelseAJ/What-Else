function shuffle() {
  alert("Shuffle button clicked!");
}

function clearResults() {
  document.getElementById("resultsBox").innerHTML = "Results will appear here.";
}

function search() {
  const actor1 = document.getElementById("actor1").value;
  const actor2 = document.getElementById("actor2").value;
  document.getElementById("resultsBox").innerHTML = 
    `Searching for shared projects between ${actor1} and ${actor2}...`;
}
