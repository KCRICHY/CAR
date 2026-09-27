document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lookupForm");
  const errEl = document.getElementById("lookupError");
  const resultPanel = document.getElementById("resultPanel");
  const resultBody = document.getElementById("resultBody");

  function renderBooking(b) {
    resultPanel.style.display = "block";
    const hoursToDeparture = (new Date(b.departureISO) - new Date()) / 36e5;
    let refundNote;
    if (b.status === "cancelled") {
      refundNote = `Cancelled · refunded ${fmtNGN(b.refundAmount)} (${Math.round(b.refundPct * 100)}%)`;
    } else if (hoursToDeparture >= 48) refundNote = "Cancel now for a 90% refund.";
    else if (hoursToDeparture >= 12) refundNote = "Cancel now for a 50% refund.";
    else if (hoursToDeparture >= 2) refundNote = "Cancel now for a 20% refund.";
    else refundNote = "This ride departs soon — cancellations are non-refundable.";

    resultBody.innerHTML = `
      <div class="section-head" style="margin-bottom:20px;">
        <div>
          <div class="eyebrow">Reference ${b.reference}</div>
          <h3 style="margin:0;">${b.fromCity} → ${b.toCity}</h3>
        </div>
        <span class="badge badge-${b.status}">${b.status}</span>
      </div>
      <div class="calc-line"><span>Passenger</span><span class="mono">${b.passengerName}</span></div>
      <div class="calc-line"><span>Departs</span><span class="mono">${b.date} · ${b.time}</span></div>
      <div class="calc-line"><span>Vehicle</span><span class="mono">${b.vehicleName}</span></div>
      <div class="calc-line"><span>Seat tier</span><span class="mono">${b.tierLabel}</span></div>
      <div class="calc-line"><span>Passengers</span><span class="mono">${b.pax}</span></div>
      <div class="calc-line total"><span>Total</span><span class="mono">${fmtNGN(b.fare.total)}</span></div>
      <p class="form-note" style="margin-top:16px;">${refundNote}</p>
      ${b.status === "confirmed" ? `<button class="btn btn-danger" id="cancelBtn">Cancel booking</button>` : ""}
    `;

    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => {
      if (!confirm("Cancel this booking? This cannot be undone.")) return;
      const res = cancelBooking(b.reference);
      if (res.ok) renderBooking(res.booking);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ref = document.getElementById("refInput").value;
    const email = document.getElementById("emailInput").value.trim().toLowerCase();
    const booking = findBookingByReference(ref);
    if (!booking || booking.passengerEmail.toLowerCase() !== email) {
      errEl.textContent = "We couldn't find a booking matching that reference and email.";
      errEl.classList.add("show");
      resultPanel.style.display = "none";
      return;
    }
    errEl.classList.remove("show");
    renderBooking(booking);
  });
});
