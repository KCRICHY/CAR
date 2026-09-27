document.addEventListener("DOMContentLoaded", () => {
  const user = currentUser();
  if (!user || user.role !== "admin") {
    document.getElementById("notAdmin").style.display = "block";
    return;
  }
  document.getElementById("adminBody").style.display = "block";

  function renderStats() {
    const bookings = getBookings();
    const confirmed = bookings.filter(b => b.status === "confirmed");
    const payments = getPayments();
    const paidPayments = payments.filter(p => p.status === "paid");
    const revenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgLoad = bookings.length ? Math.round(bookings.reduce((s, b) => s + b.load, 0) / bookings.length) : 0;
    document.getElementById("statTiles").innerHTML = `
      <div class="stat-tile"><div class="stat-tile-num">${confirmed.length}</div><div class="stat-tile-label">Active bookings</div></div>
      <div class="stat-tile"><div class="stat-tile-num">${fmtNGN(revenue)}</div><div class="stat-tile-label">Paid revenue</div></div>
      <div class="stat-tile"><div class="stat-tile-num">${paidPayments.length}</div><div class="stat-tile-label">Payments received</div></div>
      <div class="stat-tile"><div class="stat-tile-num">${avgLoad}%</div><div class="stat-tile-label">Average ride load</div></div>
      <div class="stat-tile"><div class="stat-tile-num">${getUsers().length}</div><div class="stat-tile-label">Registered riders</div></div>
    `;
  }

  function renderBookingsTab() {
    const bookings = getBookings().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const el = document.getElementById("tab-bookings");
    if (bookings.length === 0) { el.innerHTML = `<div class="empty-state"><h3>No bookings yet</h3></div>`; return; }
    el.innerHTML = `<div class="data-table-wrap admin-table-wrap"><table class="data-table admin-table responsive-card-table">
      <thead><tr><th>Reference</th><th>Passenger</th><th>Route</th><th>Departs</th><th>Vehicle</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>${bookings.map(b => `
        <tr>
          <td data-label="Reference" class="mono">${b.reference}</td>
          <td data-label="Passenger">${b.passengerName}<br><span class="ride-meta">${b.passengerEmail}</span></td>
          <td data-label="Route">${b.from} → ${b.to}</td>
          <td data-label="Departs">${b.date} ${b.time}</td>
          <td data-label="Vehicle">${b.vehicleName}</td>
          <td data-label="Total" class="mono">${fmtNGN(b.fare.total)}</td>
          <td data-label="Payment"><span class="badge badge-${b.paymentStatus || "pending"}">${b.paymentStatus || "pending"}</span></td>
          <td data-label="Status"><span class="badge badge-${b.status}">${b.status}</span></td>
        </tr>
      `).join("")}</tbody>
    </table></div>`;
  }

  function renderPaymentsTab() {
    const el = document.getElementById("tab-payments");
    const payments = getPayments().slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    if (payments.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>No payments yet</h3><p>Payments will appear here after riders complete checkout.</p></div>`;
      return;
    }
    const paidTotal = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
    el.innerHTML = `
      <div class="payment-admin-summary">
        <span>Total recorded payments: <strong>${payments.length}</strong></span>
        <span>Paid revenue: <strong>${fmtNGN(paidTotal)}</strong></span>
      </div>
      <div class="data-table-wrap"><table class="data-table responsive-card-table">
        <thead><tr><th>Transaction</th><th>Booking</th><th>Passenger</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>${payments.map(p => `
          <tr>
            <td data-label="Transaction" class="mono">${p.transactionRef}</td>
            <td data-label="Booking" class="mono">${p.bookingReference}</td>
            <td data-label="Passenger">${p.passengerName}<br><span class="ride-meta">${p.passengerEmail}</span></td>
            <td data-label="Amount" class="mono">${fmtNGN(p.amount)}</td>
            <td data-label="Method">${p.method}</td>
            <td data-label="Date">${new Date(p.paidAt).toLocaleString()}</td>
            <td data-label="Status"><span class="badge badge-${p.status}">${p.status}</span></td>
          </tr>
        `).join("")}</tbody>
      </table></div>`;
  }

  function renderRoutesTab() {
    const el = document.getElementById("tab-routes");
    el.innerHTML = `<div class="data-table-wrap admin-table-wrap"><table class="data-table admin-table responsive-card-table">
      <thead><tr><th>Route</th><th>Distance</th><th>Current base fare</th><th>Set new base fare</th></tr></thead>
      <tbody>${ROUTES.map((r, i) => `
        <tr>
          <td data-label="Route">${r.from} → ${r.to}</td>
          <td data-label="Distance">${r.km} km</td>
          <td data-label="Current base fare" class="mono">${fmtNGN(effectiveBase(r))}</td>
          <td data-label="Set new base fare">
            <div style="display:flex; gap:8px;">
              <input type="number" min="500" step="100" id="fare-${i}" value="${effectiveBase(r)}" style="width:120px; padding:8px; border:1px solid var(--line); border-radius:6px;">
              <button class="btn btn-outline btn-sm" data-idx="${i}" data-action="save-fare">Save</button>
            </div>
          </td>
        </tr>
      `).join("")}</tbody>
    </table></div>`;
    el.querySelectorAll("[data-action='save-fare']").forEach(btn => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      const r = ROUTES[i];
      const val = Number(document.getElementById(`fare-${i}`).value);
      if (val > 0) { setRouteOverride(r.from, r.to, val); renderRoutesTab(); }
    }));
  }

  function renderUsersTab() {
    const el = document.getElementById("tab-users");
    const users = getUsers();
    el.innerHTML = `<div class="data-table-wrap admin-table-wrap"><table class="data-table admin-table responsive-card-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Bookings</th></tr></thead>
      <tbody>${users.map(u => `
        <tr><td data-label="Name">${u.name}</td><td data-label="Email">${u.email}</td><td data-label="Role">${u.role}</td><td data-label="Bookings">${bookingsForUser(u.id).length}</td></tr>
      `).join("")}</tbody>
    </table></div>`;
  }

  document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
    document.getElementById("tab-" + btn.dataset.tab).style.display = "block";
  }));

  renderStats();
  renderBookingsTab();
  renderPaymentsTab();
  renderRoutesTab();
  renderUsersTab();
});
