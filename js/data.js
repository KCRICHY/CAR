/* Gachok — seed data & fare engine. Everything here is deterministic and local. */

const HUBS = [
  { code: "AN", city: "Anambra",       zone: "Ekwulobia Terminal",    region: "South East" },
  { code: "IBA", city: "Ibadan",       zone: "Challenge Terminal",    region: "South West" },
  { code: "ABJ", city: "Abuja",        zone: "Utako Terminal",        region: "North Central" },
  { code: "PHC", city: "Port Harcourt",zone: "Waterlines Terminal",   region: "South South" },
  { code: "BEN", city: "Benin City",   zone: "Ring Road Terminal",    region: "South South" },
  { code: "ENU", city: "Enugu",        zone: "Holy Ghost Terminal",   region: "South East" },
  { code: "ILR", city: "Ilorin",       zone: "Post Office Terminal",  region: "North Central" },
  { code: "KAN", city: "Kano",         zone: "Naibawa Terminal",      region: "North West" },
  { code: "OWR", city: "Owerri",       zone: "Douglas Terminal",      region: "South East" },
  { code: "ABK", city: "Abeokuta",     zone: "Panseke Terminal",      region: "South West" },
  { code: "AKR", city: "Akure",        zone: "Oba-Ile Terminal",      region: "South West" },
  { code: "UYO", city: "Uyo",          zone: "Itam Terminal",         region: "South South" },
  { code: "ASB", city: "Asaba",        zone: "West End Terminal",     region: "South South" },
  { code: "LAG", city: "Lagos",          zone: "Iyana-Ipaja Terminal",     region: "North West" },
];

/* Route legs: distance in km, typical duration in minutes, base fare per adult in NGN. */
const ROUTES = [
  { from: "LAG", to: "IBA", km: 130, mins: 110, base: 4200,  tag: "Frequent Shuttle" },
  { from: "LAG", to: "ABJ", km: 750, mins: 540, base: 18500, tag: "Flagship Route" },
  { from: "LAG", to: "BEN", km: 320, mins: 260, base: 9800,  tag: "Popular" },
  { from: "LAG", to: "ABK", km: 80,  mins: 75,  base: 2600,  tag: "Frequent Shuttle" },
  { from: "LAG", to: "PHC", km: 610, mins: 480, base: 16200, tag: "High Demand" },
  { from: "IBA", to: "ILR", km: 145, mins: 130, base: 4600,  tag: "Popular" },
  { from: "ABJ", to: "AN", km: 285, mins: 240, base: 8900,  tag: "Popular" },
  { from: "ABJ", to: "KAN", km: 440, mins: 360, base: 12400, tag: "High Demand" },
  { from: "PHC", to: "UYO", km: 95,  mins: 90,  base: 3100,  tag: "Frequent Shuttle" },
  { from: "PHC", to: "ASB", km: 110, mins: 100, base: 3600,  tag: "Frequent Shuttle" },
  { from: "BEN", to: "ASB", km: 55,  mins: 55,  base: 2100,  tag: "Frequent Shuttle" },
  { from: "ENU", to: "OWR", km: 100, mins: 95,  base: 3400,  tag: "Frequent Shuttle" },
  { from: "ENU", to: "ABJ", km: 340, mins: 280, base: 10200, tag: "Popular" },
  { from: "LAG", to: "AKR", km: 340, mins: 280, base: 10400, tag: "Popular" },
];

/* Vehicle classes — mirrors cabin classes in the source. */
const VEHICLES = [
  {
    id: "sedan", name: "Compact Sedan", tagline: "City Hopper",
    family: "Toyota Corolla", seats: 4, luggage: "2 medium bags",
    multiplier: 1, layout: "1 driver + 4 passengers",
    feature: "AC + phone charging", pitch: "Standard legroom", power: "USB-A",
    desc: "The everyday shuttle car for solo travellers and pairs moving light between terminals."
  },
  {
    id: "suv", name: "Comfort SUV", tagline: "Extra Room",
    family: "Toyota Highlander", seats: 6, luggage: "4 large bags",
    multiplier: 1.6, layout: "1 driver + 6 passengers", captains: true,
    feature: "Captain's chairs + AC", pitch: "Reclining middle row", power: "Dual USB-C",
    desc: "Captain's chairs and real elbow room for families or small groups who want to spread out."
  },
  {
    id: "van", name: "Group Shuttle Van", tagline: "Shared Van",
    family: "Toyota Hiace", seats: 10, luggage: "10 bags + roof rack",
    multiplier: 2.2, layout: "1 driver + 10 passengers",
    feature: "Individual reading lights", pitch: "Bench seating", power: "USB-C per row",
    desc: "The workhorse of the network — shared or chartered, built for groups and long-haul legs."
  },
  {
    id: "coaster", name: "Charter Minibus", tagline: "Full Charter",
    family: "Toyota Coaster", seats: 18, luggage: "18 bags + hold",
    multiplier: 3.4, layout: "1 driver + 18 passengers",
    feature: "PA system + curtains", pitch: "Recline + footrest", power: "AC outlets",
    desc: "Charter the whole vehicle for teams, wedding parties, or church groups travelling together."
  }
];

const RIDE_TIERS = [
  { id: "shared", label: "Shared seat", desc: "Pooled with other riders on the same leg", add: 0 },
  { id: "priority", label: "Priority pickup", desc: "First pickup on the route, front-row seat", add: 1200 },
  { id: "window", label: "Window seat", desc: "Reserved window seat, no pooling on that seat", add: 800 },
  { id: "solo", label: "Solo row", desc: "Nobody seated beside you for the whole leg", add: 2500 },
];

const LIVE_HORIZON_DAYS = 14;
const VAT_RATE = 0.075;
const SERVICE_CHARGE = 1500;

/* ---------- Fare engine ---------------------------------------------------
   Mirrors the source's advance-purchase curve + load-factor demand curve,
   translated to a ride-hailing shuttle context: hours-to-departure and how
   full the specific departure already is. */
function advanceFactor(hoursToDeparture) {
  if (hoursToDeparture <= 2) return 1.5;      // last-minute surge
  if (hoursToDeparture >= 240) return 0.9;    // 10+ days out: early-bird
  // linear taper between 2h (1.5x) and 240h (0.9x)
  const t = (hoursToDeparture - 2) / (240 - 2);
  return 1.5 - t * 0.6;
}

function demandFactor(loadPct) {
  // 10% load -> 0.9x, 75% load -> ~1.08x surge threshold, 100% -> 1.35x
  if (loadPct <= 75) {
    const t = (loadPct - 10) / (75 - 10);
    return 0.9 + t * (1.08 - 0.9);
  }
  const t = (loadPct - 75) / (100 - 75);
  return 1.08 + t * (1.35 - 1.08);
}

function classMultiplier(vehicleId) {
  const v = VEHICLES.find(v => v.id === vehicleId);
  return v ? v.multiplier : 1;
}

/**
 * Compute a full fare quote.
 * @param {Object} p
 * @param {number} p.baseFare
 * @param {number} p.hoursToDeparture
 * @param {number} p.loadPct       0-100
 * @param {string} p.vehicleId
 * @param {number} p.tierAdd       add-on NGN per seat
 * @param {number} p.adults
 */
function quoteFare({ baseFare, hoursToDeparture, loadPct, vehicleId, tierAdd = 0, adults = 1 }) {
  const adv = advanceFactor(hoursToDeparture);
  const dem = demandFactor(loadPct);
  const cls = classMultiplier(vehicleId);
  const perSeat = baseFare * adv * dem * cls;
  const seatTotal = (perSeat + tierAdd) * adults;
  const vat = seatTotal * VAT_RATE;
  const total = seatTotal + vat + SERVICE_CHARGE;
  return {
    baseFare, adv, dem, cls, perSeat,
    tierAdd, adults, seatTotal,
    vat, serviceCharge: SERVICE_CHARGE,
    total: Math.round(total)
  };
}

function fmtNGN(n) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

function hubByCode(code) { return HUBS.find(h => h.code === code); }

function routeBetween(from, to) {
  return ROUTES.find(r => (r.from === from && r.to === to) || (r.from === to && r.to === from));
}

/* Deterministic pseudo-random load % per route+date+time, so the same search
   always returns the same numbers within a session (no Math.random drift). */
function seededLoad(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) { h = (h * 31 + seedStr.charCodeAt(i)) >>> 0; }
  return 15 + (h % 86); // 15-100
}

function seededDepartures(fromCode, toCode, dateStr) {
  // Three departure slots per day per route.
  const slots = ["06:30", "11:15", "16:45"];
  return slots.map((time, i) => {
    const seed = `${fromCode}${toCode}${dateStr}${time}`;
    const load = seededLoad(seed);
    return { time, load, seed };
  });
}
