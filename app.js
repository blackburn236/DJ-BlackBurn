(() => {
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
    return String(value ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[m]));
  }

  async function load() {
    try {
      const response = await fetch("/api/songs?ts=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar as músicas.");
      songs = await response.json();

      songs.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      buildFilters();
      render();
    } catch (error) {
      songsEl.innerHTML = '<div class="empty">' + esc(error.message) + '</div>';
    }
  }

  function buildFilters() {
    const genres = ["Todos", ...new Set(songs.map(s => s.genre).filter(Boolean))];

    filtersEl.innerHTML = genres.map(g =>
      `<button type="button" class="filter ${g === genre ? "active" : ""}" data-genre="${esc(g)}">${esc(g)}</button>`
    ).join("");

    filtersEl.querySelectorAll(".filter").forEach(button => {
      button.addEventListener("click", () => {
        genre = button.dataset.genre || "Todos";
        buildFilters();
        render();
      });
    });
  }

  function render() {
    const query = (searchEl.value || "").toLowerCase().trim();

    const list = songs.filter(song => {
      const matchesGenre = genre === "Todos" || song.genre === genre;
      const text = [
        song.title, song.artist, song.genre, song.description, song.year
      ].join(" ").toLowerCase();
      return matchesGenre && text.includes(query);
    });

    countEl.textContent = `${list.length} ${list.length === 1 ? "música" : "músicas"}`;

    if (!list.length) {
      songsEl.innerHTML = '<div class="empty">Ainda não há músicas para esta pesquisa.</div>';
      return;
    }

    songsEl.innerHTML = list.map((song, index) => {
      const cover = song.coverUrl
        ? `<img src="${esc(song.coverUrl)}" alt="Capa de ${esc(song.title)}" loading="lazy">`
        : '<div class="placeholder">♪</div>';

      return `
        <article class="song">
          <div class="cover">
            ${cover}
            <button type="button" class="cover-play" data-play-id="${esc(song.id)}" aria-label="Ouvir ${esc(song.title)}">▶</button>
            ${index === 0 && genre === "Todos" && !query ? '<span class="latest-badge">NOVO</span>' : ''}
          </div>
          <div class="song-body">
            <div class="song-topline">
              <span class="song-index">${String(index + 1).padStart(2, "0")}</span>
              ${song.genre ? `<span class="genre-badge">${esc(song.genre)}</span>` : ""}
            </div>
            <p class="song-title">${esc(song.title || "Sem título")}</p>
            <div class="meta">${esc(song.artist || "DJ BlackBurn")}${song.year ? " • " + esc(song.year) : ""}</div>
            ${song.description ? `<p class="desc">${esc(song.description)}</p>` : ""}
            <button type="button" class="listen-btn" data-play-id="${esc(song.id)}">▶ OUVIR AGORA</button>
          </div>
        </article>`;
    }).join("");

    songsEl.querySelectorAll("[data-play-id]").forEach(button => {
      button.addEventListener("click", () => playSong(button.dataset.playId));
    });
  }

  async function playSong(id) {
    const song = songs.find(item => String(item.id) === String(id));

    if (!song) {
      alert("Música não encontrada.");
      return;
    }

    if (!song.audioUrl) {
      alert("Esta música não tem ficheiro de áudio disponível.");
      return;
    }

    player.classList.remove("hidden");
    playerTitle.textContent = song.title || "Sem título";
    playerArtist.textContent =
      `${song.artist || "DJ BlackBurn"}${song.genre ? " • " + song.genre : ""}${song.year ? " • " + song.year : ""}`;

    playerCover.innerHTML = song.coverUrl
      ? `<img src="${esc(song.coverUrl)}" alt="">`
      : "<span>♪</span>";

    // Define a URL diretamente no elemento de áudio.
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio.src = song.audioUrl;
    audio.load();

    try {
      await audio.play();
    } catch (error) {
      console.error("Erro ao iniciar áudio:", error);
      alert("O áudio não conseguiu iniciar. Se continuar, envia-me uma captura do erro.");
      return;
    }

    document.getElementById("musica").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  audio.addEventListener("error", () => {
    console.error("Erro no elemento AUDIO:", audio.error);
    if (!player.classList.contains("hidden")) {
      alert("O ficheiro de áudio não conseguiu ser carregado. Verifica se a música está publicada no Supabase.");
    }
  });

  audio.addEventListener("canplay", () => {
    console.log("DJ BlackBurn: áudio pronto para reprodução.");
  });

  closePlayer.addEventListener("click", () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    player.classList.add("hidden");
  });

  searchEl.addEventListener("input", render);

  // Exposto apenas para diagnóstico pelo browser.
  window.DJBlackBurnPlayer = { playSong, songs: () => songs };

  load();
})();
