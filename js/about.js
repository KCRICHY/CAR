document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("overlayIcon").innerHTML = icon("people");
  document.getElementById("quoteIcon").innerHTML = icon("shield");
  document.getElementById("ctaIcon").innerHTML = icon("headset");

  const values = [
    { i: "shield", t: "Safety First", d: "We prioritize the safety of our riders, drivers, and the communities we serve." },
    { i: "check", t: "Integrity", d: "We operate with honesty, transparency, and accountability in everything we do." },
    { i: "star", t: "Excellence", d: "We're committed to delivering the highest standards in service and operations." },
    { i: "bulb", t: "Innovation", d: "We embrace technology and creative solutions to improve every journey." },
    { i: "heart", t: "Customer Focus", d: "We listen, we care, and we go the extra mile to exceed rider expectations." },
  ];
  document.getElementById("coreValuesList").innerHTML = values.map(v => `
    <div class="value-row">
      <div class="icon-feature-badge">${icon(v.i)}</div>
      <div><h4>${v.t}</h4><p>${v.d}</p></div>
    </div>
  `).join("");
});
