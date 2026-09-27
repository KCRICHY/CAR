function syncHomeAuthButtons() {
  const user = typeof currentUser === "function" ? currentUser() : null;

  // Hero/CTA buttons change after authentication:
  // signed out  -> Create your account + Sign in
  // signed in   -> Book Your Trip + Contact Us
  document.querySelectorAll(".home-account-cta").forEach((btn) => {
    if (user) {
      btn.textContent = "Book Your Trip →";
      btn.href = "index.html#searchForm";
      btn.onclick = null;
    } else {
      btn.textContent = "Create your account";
      btn.href = "register.html";
      btn.onclick = null;
    }
  });

  document.querySelectorAll(".home-contact-cta").forEach((btn) => {
    if (user) {
      btn.textContent = "Contact Us";
      btn.href = "mailto:hello@gachok.test";
      btn.onclick = null;
    } else {
      btn.textContent = "Sign in";
      btn.href = "login.html";
      btn.onclick = null;
    }
  });

  // Keep the existing sign-out behavior for any dedicated auth buttons.
  document.querySelectorAll(".home-auth-btn:not(.home-contact-cta)").forEach((btn) => {
    if (user) {
      btn.textContent = "Sign out";
      btn.href = "#";
      btn.onclick = (e) => {
        e.preventDefault();
        clearSession();
        window.location.reload();
      };
    } else {
      btn.textContent = "Sign in";
      btn.href = "login.html";
      btn.onclick = null;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  syncHomeAuthButtons();
  /* --- live clock --------------------------------------------------------*/
  function tickClock() {
    const el = document.getElementById("liveClock");
    if (!el) return;
    const d = new Date();
    el.textContent = "UTC " + d.toISOString().substr(11, 8);
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* --- search widget ------------------------------------------------------*/
  const fromSel = document.getElementById("fromHub");
  const toSel = document.getElementById("toHub");
  HUBS.forEach(h => {
    fromSel.insertAdjacentHTML("beforeend", `<option value="${h.code}">${h.city} — ${h.code}</option>`);
    toSel.insertAdjacentHTML("beforeend", `<option value="${h.code}">${h.city} — ${h.code}</option>`);
  });
  fromSel.value = "LAG";
  toSel.value = "IBA";

  document.getElementById("swapHubs").addEventListener("click", () => {
    const a = fromSel.value; fromSel.value = toSel.value; toSel.value = a;
  });

  const vehicleSel = document.getElementById("vehicleClass");
  VEHICLES.forEach(v => vehicleSel.insertAdjacentHTML("beforeend", `<option value="${v.id}">${v.name} — ${v.tagline}</option>`));

  const dateInput = document.getElementById("rideDate");
  const today = new Date();
  const maxDate = new Date(today.getTime() + LIVE_HORIZON_DAYS * 864e5);
  const iso = d => d.toISOString().slice(0, 10);
  dateInput.min = iso(today);
  dateInput.max = iso(maxDate);
  dateInput.value = iso(new Date(today.getTime() + 864e5));

  let pax = 1;
  const paxCount = document.getElementById("paxCount");
  document.getElementById("paxMinus").addEventListener("click", () => { pax = Math.max(1, pax - 1); paxCount.textContent = pax; });
  document.getElementById("paxPlus").addEventListener("click", () => { pax = Math.min(8, pax + 1); paxCount.textContent = pax; });

  /* --- one way / round trip tabs -------------------------------------------*/
  const tabOneWay = document.getElementById("tabOneWay");
  const tabRoundTrip = document.getElementById("tabRoundTrip");
  const returnWrap = document.getElementById("returnDateWrap");
  const returnDateInput = document.getElementById("returnDate");
  let tripType = "oneway";
  returnDateInput.min = iso(today);
  returnDateInput.max = iso(maxDate);

  function setTripType(type) {
    tripType = type;
    tabOneWay.classList.toggle("active", type === "oneway");
    tabRoundTrip.classList.toggle("active", type === "roundtrip");
    returnWrap.style.display = type === "roundtrip" ? "flex" : "none";
    returnDateInput.required = type === "roundtrip";
    if (type === "roundtrip" && !returnDateInput.value) {
      const d = new Date(dateInput.value); d.setDate(d.getDate() + 2);
      returnDateInput.value = iso(d);
    }
  }
  tabOneWay.addEventListener("click", () => setTripType("oneway"));
  tabRoundTrip.addEventListener("click", () => setTripType("roundtrip"));

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (fromSel.value === toSel.value) { alert("Choose two different hubs to search a route."); return; }
    if (tripType === "roundtrip" && returnDateInput.value < dateInput.value) { alert("Return date must be on or after your departure date."); return; }
    const params = new URLSearchParams({
      from: fromSel.value, to: toSel.value, date: dateInput.value,
      vehicle: vehicleSel.value, pax: String(pax), trip: tripType
    });
    if (tripType === "roundtrip") params.set("return", returnDateInput.value);
    window.location.href = "search.html?" + params.toString();
  });

  /* --- popular route cards -------------------------------------------------*/
  const routeCards = document.getElementById("routeCards");
  ROUTES.slice(0, 4).forEach(r => {
    const from = hubByCode(r.from), to = hubByCode(r.to);
    const hrs = Math.floor(r.mins / 60), mins = r.mins % 60;
    routeCards.insertAdjacentHTML("beforeend", `
      <a class="route-card" href="search.html?from=${r.from}&to=${r.to}&date=${dateInput.value}&vehicle=sedan&pax=1" style="display:block;">
        <div class="route-card-top">
          <span class="route-tag">${r.tag}</span>
          <div style="font-size:0.82rem; opacity:0.85;">${to.region}</div>
        </div>
        <div class="route-card-body">
          <div class="route-pair">${r.from} <span class="arrow">→</span> ${r.to}</div>
          <div class="route-sub">${from.city} to ${to.city} · ${hrs}h ${mins}m · ${r.km} km</div>
          <div class="route-price-row">
            <span class="route-price-label">From</span>
            <span class="route-price">${fmtNGN(effectiveBase(r))}</span>
          </div>
        </div>
      </a>
    `);
  });

  /* --- fleet tabs + panel --------------------------------------------------*/
  const tabsEl = document.getElementById("fleetTabs");
  const panelEl = document.getElementById("fleetPanel");
  function vehicleGlyphSvg() {
    return `<svg viewBox="0 0 100 60" fill="none"><rect x="8" y="22" width="72" height="24" rx="6" stroke="#2FB6E0" stroke-width="2"/><path d="M18 22 L28 8 H62 L74 22" stroke="#2FB6E0" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="26" cy="46" r="6" fill="#0B1B33" stroke="#2FB6E0" stroke-width="2"/><circle cx="64" cy="46" r="6" fill="#0B1B33" stroke="#2FB6E0" stroke-width="2"/></svg>`;
  }
  function renderFleet(id) {
    const v = VEHICLES.find(v => v.id === id);
    tabsEl.querySelectorAll(".fleet-tab").forEach(t => t.classList.toggle("active", t.dataset.id === id));
    panelEl.innerHTML = `
      <div class="vehicle-glyph"><img src="photo_2026-09-19_21-30-27.jpg" alt="${v.name}" style="width: 100%; border-radious:var(--radious-1); object-fit:cover; aspect-ratio:4/3;"></div>
      <div>
        <div class="eyebrow">${v.tagline}</div>
        <h3 style="font-size:1.5rem;">${v.name}</h3>
        <p>${v.desc}</p>
        <ul class="check-list">
          <li>${v.feature}</li>
          <li>${v.pitch}</li>
          <li>${v.luggage}</li>
          <li>Power: ${v.power}</li>
        </ul>
        <div class="fleet-spec-grid">
          <div class="fleet-spec"><div class="fleet-spec-label">Family</div><div class="fleet-spec-value">${v.family}</div></div>
          <div class="fleet-spec"><div class="fleet-spec-label">Seats</div><div class="fleet-spec-value">${v.seats} passengers</div></div>
          <div class="fleet-spec"><div class="fleet-spec-label">Layout</div><div class="fleet-spec-value">${v.layout}</div></div>
          <div class="fleet-spec"><div class="fleet-spec-label">Fare multiplier</div><div class="fleet-spec-value">× ${v.multiplier}</div></div>
        </div>
      </div>
    `;
  }
  VEHICLES.forEach((v, i) => tabsEl.insertAdjacentHTML("beforeend", `<button type="button" class="fleet-tab" data-id="${v.id}">${v.name}</button>`));
  tabsEl.querySelectorAll(".fleet-tab").forEach(t => t.addEventListener("click", () => renderFleet(t.dataset.id)));
  renderFleet(VEHICLES[1].id);

  /* --- fare calculator ------------------------------------------------------*/
  const calcHours = document.getElementById("calcHours");
  const calcLoad = document.getElementById("calcLoad");
  const vehicleChips = document.getElementById("calcVehicleChips");
  const tierChips = document.getElementById("calcTierChips");
  let calcVehicle = "sedan", calcTier = RIDE_TIERS[0];

  VEHICLES.forEach(v => vehicleChips.insertAdjacentHTML("beforeend", `<button type="button" class="chip" data-id="${v.id}">${v.name} (×${v.multiplier})</button>`));
  RIDE_TIERS.forEach(t => tierChips.insertAdjacentHTML("beforeend", `<button type="button" class="chip" data-id="${t.id}">${t.label}</button>`));

  function updateCalc() {
    vehicleChips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.id === calcVehicle));
    tierChips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.id === calcTier.id));

    const hours = Number(calcHours.value);
    const load = Number(calcLoad.value);
    document.getElementById("calcHoursVal").textContent = hours + " hrs";
    document.getElementById("calcLoadVal").textContent = load + "%";

    const baseFare = 4200; // reference: LAG-IBA
    const q = quoteFare({ baseFare, hoursToDeparture: hours, loadPct: load, vehicleId: calcVehicle, tierAdd: calcTier.add, adults: 1 });

    document.getElementById("outBase").textContent = "NGN " + baseFare.toLocaleString("en-NG");
    document.getElementById("outAdv").textContent = "× " + q.adv.toFixed(2);
    document.getElementById("outDem").textContent = "× " + q.dem.toFixed(2);
    document.getElementById("outCls").textContent = "× " + q.cls;
    document.getElementById("outPerSeat").textContent = "NGN " + Math.round(q.perSeat).toLocaleString("en-NG");
    document.getElementById("outTier").textContent = "+NGN " + q.tierAdd.toLocaleString("en-NG");
    document.getElementById("outVat").textContent = "+NGN " + Math.round(q.vat).toLocaleString("en-NG");
    document.getElementById("outSvc").textContent = "+NGN " + q.serviceCharge.toLocaleString("en-NG");
    document.getElementById("outTotal").textContent = "NGN " + q.total.toLocaleString("en-NG");
  }
  calcHours.addEventListener("input", updateCalc);
  calcLoad.addEventListener("input", updateCalc);
  vehicleChips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; calcVehicle = b.dataset.id; updateCalc(); });
  tierChips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; calcTier = RIDE_TIERS.find(t => t.id === b.dataset.id); updateCalc(); });
  updateCalc();

  /* --- FAQ ------------------------------------------------------------------*/
  const faqs = [
    { q: "Is real money charged during booking?", a: "No. Gachok is a self-contained simulation. All routes, fares, and booking references are managed locally in the browser. No external payment gateway is contacted." },
    { q: "How does Gachok persist bookings, routes, and accounts?", a: "Everything accounts, sessions, bookings, and any admin fare changes is stored in the browser's localStorage. Nothing is sent to a server." },
    { q: "How is demand-based pricing calculated for each ride?", a: "Each departure combines an advance-booking multiplier (how many hours until departure), a load-factor multiplier (how full that specific ride already is), and a vehicle class multiplier, then adds VAT and a service charge." },
    { q: "Can I manage, modify, or cancel my reservation?", a: "Yes. Use Manage booking with your reference to view the itinerary and cancel. Refunds are calculated automatically based on how close to departure you cancel." },
    { q: "What capabilities does the Administrator account offer?", a: "Admins can view every booking across all riders, adjust base fares per route, and see live network statistics from the admin dashboard." },
    { q: "How do I test with pre-seeded demonstration accounts?", a: "Sign in with either demo account shown below both a customer and an administrator profile are created automatically the first time the app loads." }
  ];
  const faqList = document.getElementById("faqList");
  faqs.forEach((f, i) => {
    faqList.insertAdjacentHTML("beforeend", `
      <div class="faq-item ${i === 0 ? "open" : ""}">
        <button type="button" class="faq-q"><span>${f.q}</span><span class="icon">+</span></button>
        <div class="faq-a"><p>${f.a}</p></div>
      </div>
    `);
  });
  faqList.querySelectorAll(".faq-item").forEach(item => {
    item.querySelector(".faq-q").addEventListener("click", () => item.classList.toggle("open"));
  });

  /* --- why choose us icons ---------------------------------------------------*/
  const whyItems = [
    { i: "shield", t: "Safety First", d: "Every driver and vehicle is vetted before dispatch. Your safety is our highest priority." },
    { i: "seat", t: "Comfortable Rides", d: "Modern vehicles with premium comfort, from compact sedans to full charter minibuses." },
    { i: "clock", t: "On-Time Service", d: "Punctual departures you can depend on, tracked live on our schedule board." },
    { i: "headset", t: "Customer Support", d: "We're here for you 24/7, from booking through to your final drop-off." },
  ];
  document.getElementById("whyChooseGrid").innerHTML = whyItems.map(w => `
    <div class="icon-feature"><div class="icon-feature-badge">${icon(w.i)}</div><h3>${w.t}</h3><p>${w.d}</p></div>
  `).join("");

  /* --- about preview + cta icons ----------------------------------------------*/
  const overlayIcon = document.getElementById("overlayIcon");
  if (overlayIcon) overlayIcon.innerHTML = icon("people");
  const ctaIcon = document.getElementById("ctaIcon");
  if (ctaIcon) ctaIcon.innerHTML = icon("headset");
  /* --- services preview grid ---------------------------------------------------*/
  const servicesPreview = [
    { i: "bus", t: "Passenger Transport", d: "Intercity travel across major hubs in Nigeria with comfort and safety.", href: "services.html#passenger" },
    { i: "people", t: "Charter Services", d: "Hire a full vehicle for schools, events, church trips and more.", href: "services.html#charter" },
    { i: "briefcase", t: "Staff Transportation", d: "Reliable staff shuttle services for businesses and organizations.", href: "services.html#staff" },
    { i: "plane", t: "Airport Transfers", d: "Comfortable and timely transfers to and from airports.", href: "services.html#airport" },
    { i: "box", t: "Logistics Services", d: "Parcel and cargo delivery services across select routes.", href: "services.html#logistics" },
  ];
  const servicesPreviewGrid = document.getElementById("servicesPreviewGrid");
  if (servicesPreviewGrid) servicesPreviewGrid.innerHTML = servicesPreview.map(s => `
    <div class="service-card">
      <div class="icon-feature-badge">${icon(s.i)}</div>
      <h3>${s.t}</h3>
      <p>${s.d}</p>
      <a href="${s.href}">Learn more →</a>
    </div>
  `).join("");
});
