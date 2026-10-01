const songsEl=document.getElementById("songs"),filtersEl=document.getElementById("filters"),searchEl=document.getElementById("search");
const player=document.getElementById("player"),audio=document.getElementById("audio"),playerTitle=document.getElementById("playerTitle"),playerArtist=document.getElementById("playerArtist"),playerCover=document.getElementById("playerCover"),countEl=document.getElementById("count");
let songs=[],genre="Todos";
document.getElementById("year").textContent=new Date().getFullYear();

async function load(){
  try{
    const r=await fetch("/api/songs");
    if(!r.ok) throw new Error("Não foi possível carregar as músicas.");
    songs=await r.json();
    songs.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    buildFilters();
    render();
  }catch(e){
    songsEl.innerHTML=`<div class="empty">${esc(e.message)}</div>`;
  }
}

function buildFilters(){
  const genres=["Todos",...new Set(songs.map(s=>s.genre).filter(Boolean))];
  filtersEl.innerHTML=genres.map(g=>`<button class="filter ${g===genre?"active":""}" onclick="setGenre(${JSON.stringify(g)})">${esc(g)}</button>`).join("");
}

function setGenre(g){genre=g;buildFilters();render();}

function render(){
  const q=(searchEl.value||"").toLowerCase().trim();
  const list=songs.filter(s=>
    (genre==="Todos"||s.genre===genre) &&
    [s.title,s.artist,s.genre,s.description,s.year].join(" ").toLowerCase().includes(q)
  );
  countEl.textContent=`${list.length} ${list.length===1?"música":"músicas"}`;

  if(!list.length){
    songsEl.innerHTML='<div class="empty">Ainda não há músicas para esta pesquisa.</div>';
    return;
  }

  songsEl.innerHTML=list.map((s,i)=>`
    <article class="song">
      <div class="cover">
        ${s.coverUrl?`<img src="${esc(s.coverUrl)}" alt="Capa de ${esc(s.title)}" loading="lazy">`:'<div class="placeholder">♪</div>'}
        <button class="cover-play" type="button" aria-label="Ouvir ${esc(s.title)}" onclick="playSong(${JSON.stringify(s.id)})">▶</button>
        ${i===0 && genre==="Todos" && !q?'<span class="latest-badge">NOVO</span>':''}
      </div>
      <div class="song-body">
        <div class="song-topline">
          <span class="song-index">${String(i+1).padStart(2,"0")}</span>
          ${s.genre?`<span class="genre-badge">${esc(s.genre)}</span>`:""}
        </div>
        <p class="song-title">${esc(s.title||"Sem título")}</p>
        <div class="meta">${esc(s.artist||"DJ BlackBurn")} ${s.year?"• "+esc(s.year):""}</div>
        ${s.description?`<p class="desc">${esc(s.description)}</p>`:""}
        <button class="listen-btn" onclick="playSong(${JSON.stringify(s.id)})">▶ OUVIR AGORA</button>
      </div>
    </article>
  `).join("");
}

function playSong(id){
  const s=songs.find(x=>String(x.id)===String(id));
  if(!s||!s.audioUrl)return;
  player.classList.remove("hidden");
  playerTitle.textContent=s.title||"Sem título";
  playerArtist.textContent=`${s.artist||"DJ BlackBurn"}${s.genre?" • "+s.genre:""}`;
  playerCover.innerHTML=s.coverUrl?`<img src="${esc(s.coverUrl)}" alt="">`:'<span>♪</span>';
  if(audio.src!==s.audioUrl)audio.src=s.audioUrl;
  audio.play().catch(()=>{});
  player.scrollIntoView({behavior:"smooth",block:"nearest"});
}

document.getElementById("closePlayer").addEventListener("click",()=>{
  audio.pause();
  player.classList.add("hidden");
});
searchEl.addEventListener("input",render);
load();

function esc(x){
  return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
