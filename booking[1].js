/* DJ BLACKBURN — BOOKING: envio direto por FormSubmit */
(function(){
  const form = document.getElementById("bookingForm");
  const status = document.getElementById("bookingStatus");
  if(!form) return;

  form.addEventListener("submit", async function(e){
    e.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);

    data.append("_subject", "Novo pedido de Booking — DJ BlackBurn");
    data.append("_template", "table");
    data.append("_captcha", "true");

    if(button){
      button.disabled = true;
      button.textContent = "A ENVIAR...";
    }
    status.textContent = "A enviar o pedido de booking…";

    try{
      const response = await fetch("https://formsubmit.co/ajax/dcoutinho236@gmail.com", {
        method: "POST",
        headers: {
          "Accept": "application/json"
        },
        body: data
      });

      const result = await response.json();

      if(!response.ok || result.success === false){
        throw new Error(result.message || "Não foi possível enviar o pedido.");
      }

      form.reset();
      status.textContent = "✅ Pedido enviado com sucesso! Obrigado pelo contacto.";
    }catch(error){
      console.error(error);
      status.textContent = "❌ Não foi possível enviar. Tenta novamente dentro de alguns segundos.";
    }finally{
      if(button){
        button.disabled = false;
        button.textContent = "📩 ENVIAR PEDIDO DE BOOKING";
      }
    }
  });
})();
