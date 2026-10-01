const songsEl = document.getElementById("songs");
const filtersEl = document.getElementById("filters");
const searchEl = document.getElementById("search");
const player = document.getElementById("player");
const audio = document.getElementById("audio");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerCover = document.getElementById("playerCover");
const countEl = document.getElementById("count");
const yearEl = document.getElementById("year");
const closePlayer = document.getElementById("closePlayer");

let songs = [];
let genre = "Todos";

if (yearEl) yearEl.textContent = new Date().getFullYear();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}

async function load() {
  try {
    const response = await fetch("/api/songs", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar as músicas.");
    songs = await response.json();
    buildFilters();
    render();
  } catch (error) {
    songsEl.innerHTML = '<div class="empty">' + esc(error.message) + "</div>";
  }
}

function buildFilters() {
  const genres = ["Todos"].concat(
    Array.from(new Set(songs.map(function (s) { return s.genre; }).filter(Boolean)))
  );

  filtersEl.innerHTML = genres.map(function (g) {
    return '<button class="filter ' + (g === genre ? "active" : "") +
      '" data-genre="' + esc(g) + '">' + esc(g) + "</button>";
  }).join("");

  filtersEl.querySelectorAll(".filter").forEach(function (button) {
    button.addEventListener("click", function () {
      genre = button.getAttribute("data-genre") || "Todos";
      buildFilters();
      render();
    });
  });
}

function render() {
  const query = (searchEl.value || "").toLowerCase().trim();

  const list = songs.filter(function (song) {
    const matchesGenre = genre === "Todos" || song.genre === genre;
    const text = [
      song.title,
      song.artist,
      song.genre,
      song.description
    ].join(" ").toLowerCase();
    return matchesGenre && text.includes(query);
  });

  countEl.textContent = list.length + " " + (list.length === 1 ? "música" : "músicas");

  if (!list.length) {
    songsEl.innerHTML = '<div class="empty">Ainda não há músicas para esta pesquisa.</div>';
    return;
  }

  songsEl.innerHTML = list.map(function (song) {
    const cover = song.coverUrl
      ? '<img src="' + esc(song.coverUrl) + '" alt="Capa de ' + esc(song.title) + '" loading="lazy">'
      : '<div class="placeholder">♪</div>';

    const meta = esc(song.artist || "DJ BlackBurn") +
      (song.year ? " • " + esc(song.year) : "") +
      (song.genre ? " • " + esc(song.genre) : "");

    return '<article class="song">' +
      '<div class="cover">' + cover + "</div>" +
      '<div class="song-body">' +
      '<p class="song-title">' + esc(song.title) + "</p>" +
      '<div class="meta">' + meta + "</div>" +
      (song.description ? '<p class="desc">' + esc(song.description) + "</p>" : "") +
      '<button class="listen-btn" data-song-id="' + esc(song.id) + '">▶ OUVIR</button>' +
      "</div></article>";
  }).join("");

  songsEl.querySelectorAll(".listen-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      playSong(button.getAttribute("data-song-id"));
    });
  });
}

function playSong(id) {
  const song = songs.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!song || !song.audioUrl) {
    alert("O ficheiro de áudio desta música não está disponível.");
    return;
  }

  player.classList.remove("hidden");
  playerTitle.textContent = song.title || "Sem título";
  playerArtist.textContent =
    (song.artist || "DJ BlackBurn") +
    (song.genre ? " • " + song.genre : "");

  playerCover.innerHTML = song.coverUrl
    ? '<img src="' + esc(song.coverUrl) + '" alt="">'
    : "<span>♪</span>";

  if (audio.src !== song.audioUrl) {
    audio.src = song.audioUrl;
    audio.load();
  }

  const promise = audio.play();
  if (promise && promise.catch) promise.catch(function () {});

  window.scrollTo({
    top: Math.max(0, document.getElementById("musica").offsetTop - 80),
    behavior: "smooth"
  });
}

closePlayer.addEventListener("click", function () {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  player.classList.add("hidden");
});

searchEl.addEventListener("input", render);

load();
