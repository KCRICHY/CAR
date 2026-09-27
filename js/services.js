document.addEventListener("DOMContentLoaded", () => {
  const services = [
    { i: "bus", t: "Passenger Transport", d: "Intercity travel across major hubs in Nigeria with comfort and safety.", href: "#passenger" },
    { i: "people", t: "Charter Services", d: "Hire our vehicles for schools, events, church trips and more.", href: "#charter" },
    { i: "briefcase", t: "Staff Transportation", d: "Reliable staff shuttle services for businesses and organizations.", href: "#staff" },
    { i: "plane", t: "Airport Transfers", d: "Comfortable and timely transfers to and from airports.", href: "#airport" },
    { i: "box", t: "Logistics Services", d: "Parcel and cargo delivery services across select routes.", href: "#logistics" },
  ];
  document.getElementById("servicesOverviewGrid").innerHTML = services.map(s => `
    <a class="service-card" href="${s.href}" style="display:block;">
      <div class="icon-feature-badge">${icon(s.i)}</div>
      <h3>${s.t}</h3>
      <p>${s.d}</p>
      <span>Jump to details →</span>
    </a>
  `).join("");

  const ctaIcon = document.getElementById("ctaIcon");
  if (ctaIcon) ctaIcon.innerHTML = icon("headset");
});
