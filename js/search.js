document.addEventListener("DOMContentLoaded", () => {
  const rtIcon = document.getElementById("roundTripIcon");
  if (rtIcon) rtIcon.innerHTML = icon("clock");
  const params = new URLSearchParams(window.location.search);
  const fromSel = document.getElementById("fromHub");
  const toSel = document.getElementById("toHub");
  const dateInput = document.getElementById("rideDate");

  HUBS.forEach(h => {
    fromSel.insertAdjacentHTML("beforeend", `<option value="${h.code}">${h.city} — ${h.code}</option>`);
    toSel.insertAdjacentHTML("beforeend", `<option value="${h.code}">${h.city} — ${h.code}</option>`);
  });

  const today = new Date();
  const maxDate = new Date(today.getTime() + LIVE_HORIZON_DAYS * 864e5);
  const iso = d => d.toISOString().slice(0, 10);
  dateInput.min = iso(today);
  dateInput.max = iso(maxDate);

  fromSel.value = params.get("from") || "LAG";
  toSel.value = params.get("to") || "IBA";
  dateInput.value = params.get("date") || iso(new Date(today.getTime() + 864e5));

  let pax = Math.min(8, Math.max(1, Number(params.get("pax")) || 1));
  const paxCount = document.getElementById("paxCount");
  paxCount.textContent = pax;
  document.getElementById("paxMinus").addEventListener("click", () => { pax = Math.max(1, pax - 1); paxCount.textContent = pax; });
  document.getElementById("paxPlus").addEventListener("click", () => { pax = Math.min(8, pax + 1); paxCount.textContent = pax; });

  document.getElementById("swapHubs").addEventListener("click", () => {
    const a = fromSel.value; fromSel.value = toSel.value; toSel.value = a;
  });

  document.getElementById("refineForm").addEventListener("submit", (e) => {
    e.preventDefault();
    render();
    history.replaceState(null, "", `search.html?from=${fromSel.value}&to=${toSel.value}&date=${dateInput.value}&pax=${pax}`);
  });

  let vehicleFilter = "all";
  const tabsEl = document.getElementById("vehicleFilterTabs");
  tabsEl.insertAdjacentHTML("beforeend", `<button type="button" class="fleet-tab active" data-id="all">All vehicles</button>`);
  VEHICLES.forEach(v => tabsEl.insertAdjacentHTML("beforeend", `<button type="button" class="fleet-tab" data-id="${v.id}">${v.name}</button>`));
  tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".fleet-tab"); if (!b) return;
    vehicleFilter = b.dataset.id;
    tabsEl.querySelectorAll(".fleet-tab").forEach(t => t.classList.toggle("active", t === b));
    renderResults();
  });

  let currentRoute = null;

  function render() {
    const from = fromSel.value, to = toSel.value;
    const fromHub = hubByCode(from), toHub = hubByCode(to);
    const route = routeBetween(from, to);
    document.getElementById("routeSummary").textContent = route
      ? `${fromHub.city} (${from}) to ${toHub.city} (${to}) · ${route.km} km · departing ${dateInput.value}`
      : `${fromHub.city} (${from}) to ${toHub.city} (${to}) · departing ${dateInput.value}`;

    currentRoute = route;
    document.getElementById("noRoute").style.display = route ? "none" : "block";
    document.getElementById("resultsWrap").style.display = route ? "block" : "none";

    const returnDate = params.get("return");
    const roundTripNote = document.getElementById("roundTripNote");
    if (roundTripNote) {
      if (params.get("trip") === "roundtrip" && returnDate) {
        roundTripNote.style.display = "flex";
        roundTripNote.querySelector("span").textContent =
          `Round trip selected — outbound ${dateInput.value}, returning ${returnDate}. Book your outbound leg below, then search ${toHub.city} → ${fromHub.city} for ${returnDate} to book the return leg.`;
      } else {
        roundTripNote.style.display = "none";
      }
    }
    if (route) renderResults();
  }

  function renderResults() {
    const route = currentRoute;
    const resultsEl = document.getElementById("rideResults");
    resultsEl.innerHTML = "";
    const from = fromSel.value, to = toSel.value;
    const departures = seededDepartures(from, to, dateInput.value);
    const base = effectiveBase(route);
    const hrs = Math.floor(route.mins / 60), mins = route.mins % 60;

    const vehiclesToShow = vehicleFilter === "all" ? VEHICLES : VEHICLES.filter(v => v.id === vehicleFilter);
    let any = false;

    departures.forEach(dep => {
      const departureDate = new Date(dateInput.value + "T" + dep.time + ":00");
      const hoursToDeparture = Math.max(0.25, (departureDate - new Date()) / 36e5);

      vehiclesToShow.forEach(v => {
        any = true;
        const q = quoteFare({ baseFare: base, hoursToDeparture, loadPct: dep.load, vehicleId: v.id, tierAdd: 0, adults: pax });
        const loadClass = dep.load >= 90 ? "critical" : dep.load >= 75 ? "high" : "";
        const seatsLeft = Math.max(1, Math.round(v.seats * (1 - dep.load / 100)));
        const params = new URLSearchParams({
          from, to, date: dateInput.value, time: dep.time, vehicle: v.id, pax: String(pax), load: String(dep.load)
        });
        resultsEl.insertAdjacentHTML("beforeend", `
          <div class="ride-row">
            <div>
              <div class="ride-time">${dep.time}</div>
              <div class="ride-meta">${hrs}h ${mins}m</div>
            </div>
            <div>
              <div class="ride-vehicle-name">${v.name}</div>
              <div class="ride-meta">${v.family} · ${seatsLeft} of ${v.seats} seats left</div>
              <div class="load-bar"><div class="load-bar-fill ${loadClass}" style="width:${dep.load}%;"></div></div>
            </div>
            <div class="ride-meta">Load ${dep.load}%</div>
            <div class="ride-price">
              <div class="amount">${fmtNGN(q.total)}</div>
              <div class="per">for ${pax} passenger${pax > 1 ? "s" : ""}</div>
              <a class="btn btn-primary btn-sm" style="margin-top:8px;" href="booking.html?${params.toString()}">Select</a>
            </div>
          </div>
        `);
      });
    });

    if (!any) resultsEl.innerHTML = `<div class="empty-state"><h3>No departures match this filter</h3><p>Try a different vehicle class.</p></div>`;
  }

  render();
});
