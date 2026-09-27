document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("bookingsList");

  function render() {
    const user = currentUser();
    if (!user) {
      document.getElementById("signedOut").style.display = "block";
      listEl.innerHTML = "";
      return;
    }
    document.getElementById("signedOut").style.display = "none";
    const bookings = bookingsForUser(user.id);

    if (bookings.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><h3>No bookings yet</h3><p>Search a route to book your first ride.</p><a href="index.html" class="btn btn-primary">Book a ride</a></div>`;
      return;
    }

    listEl.innerHTML = `<div class="data-table-wrap bookings-table-wrap"><table class="data-table bookings-table responsive-card-table">
      <thead><tr><th>Reference</th><th>Route</th><th>Departs</th><th>Vehicle</th><th>Passengers</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
      <tbody>${bookings.map(b => `
        <tr>
          <td data-label="Reference" class="mono">${b.reference}</td>
          <td data-label="Route">${b.from} → ${b.to}</td>
          <td data-label="Departs">${b.date} · ${b.time}</td>
          <td data-label="Vehicle">${b.vehicleName}</td>
          <td data-label="Passengers">${b.pax}</td>
          <td data-label="Total" class="mono">${fmtNGN(b.fare.total)}</td>
          <td data-label="Payment"><span class="badge badge-${b.paymentStatus || "pending"}">${b.paymentStatus || "pending"}</span></td>
          <td data-label="Status"><span class="badge badge-${b.status}">${b.status}</span></td>
          <td data-label="">
            ${b.status === "confirmed" ? `<button class="btn btn-outline btn-sm cancel-btn" data-ref="${b.reference}">Cancel</button>` : ""}
          </td>
        </tr>
      `).join("")}</tbody>
    </table></div>`;

    listEl.querySelectorAll(".cancel-btn").forEach(btn => btn.addEventListener("click", () => {
      if (!confirm(`Cancel booking ${btn.dataset.ref}? A refund will be calculated based on time to departure.`)) return;
      const res = cancelBooking(btn.dataset.ref);
      if (res.ok) alert(`Cancelled. Refund: ${fmtNGN(res.booking.refundAmount)} (${Math.round(res.booking.refundPct * 100)}%).`);
      render();
    }));
  }

  render();
});
