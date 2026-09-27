document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from"), to = params.get("to"), date = params.get("date"),
        time = params.get("time"), vehicleId = params.get("vehicle"),
        pax = Math.min(8, Math.max(1, Number(params.get("pax")) || 1)),
        load = Number(params.get("load")) || 50;

  const route = routeBetween(from, to);
  const vehicle = VEHICLES.find(v => v.id === vehicleId);

  if (!route || !vehicle || !time) {
    document.getElementById("bookingFlow").innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Missing ride details</h3><p>Start a new search to select a ride.</p><a href="index.html" class="btn btn-outline">Back to home</a></div>`;
  } else {
    const fromHub = hubByCode(from), toHub = hubByCode(to);
    const departureDate = new Date(date + "T" + time + ":00");
    const hoursToDeparture = Math.max(0.25, (departureDate - new Date()) / 36e5);
    const hrs = Math.floor(route.mins / 60), mins = route.mins % 60;

    document.getElementById("pageSub").textContent = `${fromHub.city} to ${toHub.city} · ${date} at ${time}`;
    document.getElementById("pPax").value = pax + (pax > 1 ? " passengers" : " passenger");

    document.getElementById("rideSummaryBody").innerHTML = `
      <div class="route-pair" style="font-size:1rem;">${from} <span class="arrow">→</span> ${to}</div>
      <p class="ride-meta" style="margin:6px 0 14px;">${fromHub.city} to ${toHub.city} · ${date} · departs ${time} · ${hrs}h ${mins}m</p>
      <p class="ride-meta">${vehicle.name} · ${vehicle.family} · ${vehicle.layout}</p>
      <p class="ride-meta">Ride load: ${load}%</p>
    `;

    const user = currentUser();
    if (user) { document.getElementById("pName").value = user.name; document.getElementById("pEmail").value = user.email; }

    let tier = RIDE_TIERS[0];
    const tierChips = document.getElementById("tierChips");
    RIDE_TIERS.forEach(t => tierChips.insertAdjacentHTML("beforeend", `<button type="button" class="chip" data-id="${t.id}">${t.label}${t.add ? " +" + fmtNGN(t.add) : ""}</button>`));

    function quote() {
      return quoteFare({ baseFare: effectiveBase(route), hoursToDeparture, loadPct: load, vehicleId: vehicle.id, tierAdd: tier.add, adults: pax });
    }

    function renderFare() {
      const q = quote();
      tierChips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.id === tier.id));
      document.getElementById("tierDesc").textContent = tier.desc;
      document.getElementById("fareBreakdown").innerHTML = `
        <div class="calc-line"><span>Base fare</span><span class="mono">${fmtNGN(q.baseFare)}</span></div>
        <div class="calc-line"><span>Advance-booking ×</span><span class="mono">${q.adv.toFixed(2)}</span></div>
        <div class="calc-line"><span>Demand load ×</span><span class="mono">${q.dem.toFixed(2)}</span></div>
        <div class="calc-line"><span>Vehicle class ×</span><span class="mono">${q.cls}</span></div>
        <div class="calc-line"><span>Per-seat fare</span><span class="mono">${fmtNGN(q.perSeat)}</span></div>
        <div class="calc-line"><span>Seat tier (×${pax})</span><span class="mono">+${fmtNGN(tier.add * pax)}</span></div>
        <div class="calc-line"><span>VAT (7.5%)</span><span class="mono">+${fmtNGN(q.vat)}</span></div>
        <div class="calc-line"><span>Service charge</span><span class="mono">+${fmtNGN(q.serviceCharge)}</span></div>
        <div class="calc-line total"><span>Total</span><span class="mono">${fmtNGN(q.total)}</span></div>
      `;
    }
    tierChips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; tier = RIDE_TIERS.find(t => t.id === b.dataset.id); renderFare(); });
    renderFare();

    document.getElementById("passengerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("pName").value.trim();
      const email = document.getElementById("pEmail").value.trim();
      const phone = document.getElementById("pPhone").value.trim();
      const errEl = document.getElementById("formError");
      if (!name || !email || !phone) { errEl.textContent = "Please fill in every field."; errEl.classList.add("show"); return; }
      errEl.classList.remove("show");

      const q = quote();
      const booking = createBooking({
        userId: user ? user.id : null,
        passengerName: name, passengerEmail: email, passengerPhone: phone,
        from, to, fromCity: fromHub.city, toCity: toHub.city,
        date, time, departureISO: departureDate.toISOString(),
        vehicleId: vehicle.id, vehicleName: vehicle.name,
        tierId: tier.id, tierLabel: tier.label,
        pax, load, fare: q
      });

      const bookingFlow = document.getElementById("bookingFlow");
      const paymentPanel = document.getElementById("paymentPanel");
      const paymentSuccess = document.getElementById("confirmPanel");
      const paymentAmount = document.getElementById("paymentAmount");
      const paymentForm = document.getElementById("paymentForm");
      const paymentMethod = document.getElementById("paymentMethod");
      const cardFields = document.getElementById("cardFields");
      const transferNotice = document.getElementById("transferNotice");
      const ussdNotice = document.getElementById("ussdNotice");
      const paymentError = document.getElementById("paymentError");
      const stepDetails = document.getElementById("stepDetails");
      const stepPayment = document.getElementById("stepPayment");
      const stepConfirm = document.getElementById("stepConfirm");

      paymentAmount.textContent = fmtNGN(q.total);
      bookingFlow.style.display = "none";
      stepDetails.classList.remove("active");
      stepDetails.classList.add("done");
      stepPayment.classList.add("active");
      paymentPanel.style.display = "block";

      const paymentMethodPicker = document.getElementById("paymentMethodPicker");
      const paymentMethodTrigger = document.getElementById("paymentMethodTrigger");
      const paymentMethodMenu = document.getElementById("paymentMethodMenu");
      const paymentMethodLabel = document.getElementById("paymentMethodLabel");

      function updatePaymentMethod() {
        const method = paymentMethod.value;
        cardFields.style.display = method === "Card" ? "block" : "none";
        transferNotice.style.display = method === "Bank Transfer" ? "flex" : "none";
        ussdNotice.style.display = method === "USSD" ? "flex" : "none";
      }

      paymentMethodMenu.querySelectorAll(".payment-option").forEach(option => {
        option.addEventListener("click", () => {
          paymentMethod.value = option.dataset.value;
          paymentMethodLabel.textContent = option.textContent.trim();
          paymentMethodMenu.querySelectorAll(".payment-option").forEach(item => {
            const selected = item === option;
            item.classList.toggle("active", selected);
            item.setAttribute("aria-selected", selected ? "true" : "false");
          });
          paymentMethodPicker.classList.remove("open");
          paymentMethodTrigger.setAttribute("aria-expanded", "false");
          updatePaymentMethod();
        });
      });

      paymentMethodTrigger.addEventListener("click", () => {
        const open = paymentMethodPicker.classList.toggle("open");
        paymentMethodTrigger.setAttribute("aria-expanded", open ? "true" : "false");
      });

      document.addEventListener("click", (event) => {
        if (!paymentMethodPicker.contains(event.target)) {
          paymentMethodPicker.classList.remove("open");
          paymentMethodTrigger.setAttribute("aria-expanded", "false");
        }
      });

      updatePaymentMethod();

      paymentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        paymentError.classList.remove("show");
        const method = paymentMethod.value;

        if (method === "Card") {
          const cardNumber = document.getElementById("cardNumber").value.replace(/\D/g, "");
          const expiry = document.getElementById("cardExpiry").value.trim();
          const cvv = document.getElementById("cardCvv").value.trim();
          if (cardNumber.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
            paymentError.textContent = "Enter a valid demo card number, expiry (MM/YY), and CVV.";
            paymentError.classList.add("show");
            return;
          }
        }

        const result = recordPayment(booking.reference, method);
        if (!result.ok) {
          paymentError.textContent = result.error;
          paymentError.classList.add("show");
          return;
        }

        paymentPanel.style.display = "none";
        stepPayment.classList.remove("active");
        stepPayment.classList.add("done");
        stepConfirm.classList.add("active");
        stepConfirm.classList.add("done");
        paymentSuccess.style.display = "block";
        document.getElementById("refDisplay").textContent = result.booking.reference;
        document.getElementById("confirmSummary").innerHTML = `
          <div class="calc-line"><span>Route</span><span class="mono">${from} → ${to}</span></div>
          <div class="calc-line"><span>Departs</span><span class="mono">${date} ${time}</span></div>
          <div class="calc-line"><span>Passenger</span><span>${name}</span></div>
          <div class="calc-line"><span>Vehicle</span><span class="mono">${vehicle.name}</span></div>
          <div class="calc-line"><span>Passengers</span><span class="mono">${pax}</span></div>
          <div class="calc-line total"><span>Amount paid</span><span class="mono">${fmtNGN(result.payment.amount)}</span></div>
        `;
        document.getElementById("paymentReceipt").innerHTML = `
          <div><span>Transaction reference</span><strong>${result.payment.transactionRef}</strong></div>
          <div><span>Payment method</span><strong>${result.payment.method}</strong></div>
          <div><span>Paid on</span><strong>${new Date(result.payment.paidAt).toLocaleString()}</strong></div>
        `;
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
