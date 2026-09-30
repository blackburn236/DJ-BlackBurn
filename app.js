const songsEl=document.getElementById("songs"), filtersEl=document.getElementById("filters"), searchEl=document.getElementById("search");
let songs=[], genre="Todos";
document.getElementById("year").textContent=new Date().getFullYear();
async function load(){ const r=await fetch("/api/songs"); songs=await r.json(); buildFilters(); render(); }
function buildFilters(){ const genres=["Todos",...new Set(songs.map(s=>s.genre).filter(Boolean))]; filtersEl.innerHTML=genres.map(g=>`<button class="filter ${g===genre?"active":""}" onclick="setGenre(${JSON.stringify(g)})">${g}</button>`).join("");}
function setGenre(g){genre=g;buildFilters();render();}
function render(){
 const q=(searchEl.value||"").toLowerCase();
 const list=songs.filter(s=>(genre==="Todos"||s.genre===genre)&&[s.title,s.artist,s.genre,s.description].join(" ").toLowerCase().includes(q));
 if(!list.length){songsEl.innerHTML='<div class="empty">Ainda não há músicas publicadas.</div>';return;}
 songsEl.innerHTML=list.map(s=>`<article class="song"><div class="cover">${s.coverUrl?`<img src="${s.coverUrl}" alt="">`:'<div class="placeholder">♪</div>'}</div><div class="song-body"><p class="song-title">${esc(s.title)}</p><div class="meta">${esc(s.artist||"DJ BlackBurn")} ${s.year?"• "+esc(s.year):""} ${s.genre?"• "+esc(s.genre):""}</div><p class="desc">${esc(s.description||"")}</p><audio controls preload="none" src="${s.audioUrl}"></audio></div></article>`).join("");
}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
searchEl.addEventListener("input",render);load();