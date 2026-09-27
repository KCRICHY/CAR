/* Gachok — local persistence layer. Nothing here ever leaves the browser. */

const LS_KEYS = {
  users: "br_users",
  session: "br_session",
  bookings: "br_bookings",
  payments: "br_payments",
  routeOverrides: "br_route_overrides",
  seeded: "br_seeded_v1"
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

/* --- one-time seed of demo accounts -------------------------------------- */
function ensureSeeded() {
  if (localStorage.getItem(LS_KEYS.seeded)) return;
  const users = [
    { id: "u_customer", name: "Amaka Johnson", email: "customer@gachok.test", password: "Passw0rd", role: "customer" },
    { id: "u_admin", name: "Ops Admin", email: "admin@gachok.test", password: "Admin@123", role: "admin" }
  ];
  writeJSON(LS_KEYS.users, users);
  writeJSON(LS_KEYS.bookings, []);
  writeJSON(LS_KEYS.payments, []);
  writeJSON(LS_KEYS.routeOverrides, {});
  localStorage.setItem(LS_KEYS.seeded, "1");
}

/* --- users / auth ---------------------------------------------------------*/
function getUsers() { return readJSON(LS_KEYS.users, []); }
function saveUsers(list) { writeJSON(LS_KEYS.users, list); }

function registerUser({ name, email, password }) {
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const user = { id: "u_" + Date.now().toString(36), name, email, password, role: "customer" };
  users.push(user);
  saveUsers(users);
  setSession(user.id);
  return { ok: true, user };
}

function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: "Email or password is incorrect." };
  setSession(user.id);
  return { ok: true, user };
}

function setSession(userId) { localStorage.setItem(LS_KEYS.session, userId); }
function clearSession() { localStorage.removeItem(LS_KEYS.session); }
function currentUser() {
  const id = localStorage.getItem(LS_KEYS.session);
  if (!id) return null;
  return getUsers().find(u => u.id === id) || null;
}

/* --- bookings ---------------------------------------------------------- */
function getBookings() { return readJSON(LS_KEYS.bookings, []); }
function saveBookings(list) { writeJSON(LS_KEYS.bookings, list); }

function genReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  const existing = getBookings().map(b => b.reference);
  return existing.includes(ref) ? genReference() : ref;
}

function createBooking(booking) {
  const bookings = getBookings();
  const record = {
    ...booking,
    reference: genReference(),
    createdAt: new Date().toISOString(),
    status: "pending_payment",
    paymentStatus: "pending",
    paymentId: null
  };
  bookings.push(record);
  saveBookings(bookings);
  return record;
}

function findBookingByReference(ref) {
  return getBookings().find(b => b.reference.toUpperCase() === ref.trim().toUpperCase());
}

function bookingsForUser(userId) {
  return getBookings().filter(b => b.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function cancelBooking(reference) {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.reference.toUpperCase() === reference.toUpperCase());
  if (idx === -1) return { ok: false, error: "Booking not found." };
  const b = bookings[idx];
  if (b.status === "cancelled") return { ok: false, error: "This booking is already cancelled." };

  const hoursToDeparture = (new Date(b.departureISO) - new Date()) / 36e5;
  let refundPct;
  if (hoursToDeparture >= 48) refundPct = 0.9;
  else if (hoursToDeparture >= 12) refundPct = 0.5;
  else if (hoursToDeparture >= 2) refundPct = 0.2;
  else refundPct = 0;

  const refundAmount = Math.round(b.fare.total * refundPct);
  bookings[idx] = { ...b, status: "cancelled", cancelledAt: new Date().toISOString(), refundPct, refundAmount };
  saveBookings(bookings);

  const payments = getPayments();
  const paymentIdx = payments.findIndex(p => p.bookingReference.toUpperCase() === b.reference.toUpperCase());
  if (paymentIdx !== -1) {
    payments[paymentIdx] = {
      ...payments[paymentIdx],
      status: refundAmount > 0 ? "refunded" : "cancelled",
      refundAmount,
      refundedAt: new Date().toISOString()
    };
    savePayments(payments);
  }
  return { ok: true, booking: bookings[idx] };
}

/* --- payments ------------------------------------------------------------- */
function getPayments() { return readJSON(LS_KEYS.payments, []); }
function savePayments(list) { writeJSON(LS_KEYS.payments, list); }

function genPaymentReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "PAY-";
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  const existing = getPayments().map(p => p.transactionRef);
  return existing.includes(ref) ? genPaymentReference() : ref;
}

function paymentForBooking(reference) {
  return getPayments().find(p => p.bookingReference.toUpperCase() === reference.toUpperCase()) || null;
}

function recordPayment(reference, method) {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.reference.toUpperCase() === reference.toUpperCase());
  if (idx === -1) return { ok: false, error: "Booking not found." };
  const booking = bookings[idx];
  if (booking.status === "cancelled") return { ok: false, error: "This booking has been cancelled." };
  if (booking.paymentStatus === "paid") return { ok: false, error: "This booking has already been paid for.", payment: paymentForBooking(reference) };

  const payment = {
    id: "p_" + Date.now().toString(36),
    transactionRef: genPaymentReference(),
    bookingReference: booking.reference,
    userId: booking.userId,
    passengerName: booking.passengerName,
    passengerEmail: booking.passengerEmail,
    amount: booking.fare.total,
    method,
    status: "paid",
    paidAt: new Date().toISOString()
  };

  const payments = getPayments();
  payments.push(payment);
  savePayments(payments);

  bookings[idx] = { ...booking, status: "confirmed", paymentStatus: "paid", paymentId: payment.id, paidAt: payment.paidAt };
  saveBookings(bookings);
  return { ok: true, payment, booking: bookings[idx] };
}

/* --- admin: per-route base-fare overrides -------------------------------- */
function getRouteOverrides() { return readJSON(LS_KEYS.routeOverrides, {}); }
function setRouteOverride(from, to, base) {
  const overrides = getRouteOverrides();
  overrides[`${from}-${to}`] = base;
  writeJSON(LS_KEYS.routeOverrides, overrides);
}
function effectiveBase(route) {
  const overrides = getRouteOverrides();
  const key = `${route.from}-${route.to}`;
  return overrides[key] ?? route.base;
}
