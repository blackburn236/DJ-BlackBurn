
/* EVENTOS PRO — carrega os eventos publicados no ADMIN */
(async function(){
  const grid = document.getElementById("eventsGrid");
  if(!grid) return;

  const monthNames = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g,m=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function formatDate(value){
    if(!value) return {day:"—",month:"DATA",full:"Data a confirmar"};
    const d = new Date(value + "T12:00:00");
    if(Number.isNaN(d.getTime())) return {day:"—",month:"DATA",full:value};
    return {
      day:String(d.getDate()).padStart(2,"0"),
      month:monthNames[d.getMonth()],
      full:d.toLocaleDateString("pt-PT",{day:"2-digit",month:"long",year:"numeric"})
    };
  }

  function bookingUrl(event){
    const subject = encodeURIComponent("Booking DJ BlackBurn — " + (event.title || "Evento"));
    return "mailto:?subject=" + subject;
  }

  try{
    const response = await fetch("/api/events?ts=" + Date.now(), {cache:"no-store"});
    if(!response.ok) throw new Error("Não foi possível carregar os eventos.");
    const events = await response.json();

    events.sort((a,b)=>{
      const da = a.event_date ? new Date(a.event_date+"T12:00:00") : new Date("2999-01-01");
      const db = b.event_date ? new Date(b.event_date+"T12:00:00") : new Date("2999-01-01");
      return da-db;
    });

    if(!events.length){
      grid.innerHTML = `
        <div class="event-empty">
          <div style="font-size:42px;margin-bottom:12px">🎧</div>
          <strong style="display:block;color:#fff5e4;font-size:20px;margin-bottom:8px">Próximos eventos</strong>
          <span>Ainda não existem eventos publicados. Adiciona o próximo espetáculo através do painel ADMIN.</span>
        </div>`;
      return;
    }

    grid.innerHTML = events.map(event=>{
      const date = formatDate(event.event_date);
      const location = [event.venue,event.city].filter(Boolean).join(" — ");
      const poster = event.poster_path || "/dj-blackburn.png";

      return `
        <article class="event-card">
          <div class="event-poster-wrap">
            <img class="event-poster" src="${esc(poster)}" alt="${esc(event.title || "Evento DJ BlackBurn")}" loading="lazy">
            <div class="event-date-badge">
              <span class="event-date-day">${esc(date.day)}</span>
              <span class="event-date-month">${esc(date.month)}</span>
            </div>
            ${event.event_time ? `<span class="event-status">🕒 ${esc(event.event_time)}</span>` : ""}
          </div>
          <div class="event-body">
            <h3 class="event-title">${esc(event.title || "Evento DJ BlackBurn")}</h3>
            ${location ? `<div class="event-location"><span>📍</span><span><strong>${esc(location)}</strong></span></div>` : ""}
            <div class="event-location"><span>📅</span><span>${esc(date.full)}${event.event_time ? " • " + esc(event.event_time) : ""}</span></div>
            ${event.description ? `<p class="event-description">${esc(event.description)}</p>` : ""}
            <div class="event-actions">
              <a class="event-book" href="${bookingUrl(event)}">📩 BOOKING</a>
            </div>
          </div>
        </article>`;
    }).join("");
  }catch(error){
    grid.innerHTML = `<div class="event-empty">Não foi possível carregar os eventos neste momento.</div>`;
    console.error(error);
  }
})();
