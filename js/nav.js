/* Gachok — shared header + footer, injected on every page. */

const BRAND_MARK_SVG = `<img class="brand-mark" src="LOGO.png" alt="Gachok Transport logo">`;

function renderTopBar() {
  const el = document.getElementById("site-topbar");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="top-bar-links">
        <a href="tel:+2348012345678">📞 +234 801 234 5678</a><br>
      <a href="mailto:hello@gachok.test">✉️ hello@gachok.test</a>
      </div>
      <span class="top-bar-hours">Mon – Sun: 6:00AM – 9:00PM · Fleet Reg. BR-2016</span>
    </div>
  `;
}

function renderHeader(activePath) {
  const user = currentUser();
  const links = [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About Us" },
    { href: "services.html", label: "Services" },
    { href: "search.html", label: "Routes" },
    { href: "bookings.html", label: "My bookings" },
    { href: "manage.html", label: "Manage booking" },
  ];
  if (user && user.role === "admin") links.push({ href: "admin.html", label: "Admin" });

  const linkHtml = links.map(l =>
    `<a href="${l.href}" class="${activePath === l.href ? "active" : ""}">${l.label}</a>`
  ).join("");

  const actionsHtml = (user
    ? `<span class="header-user">HI <span class= "user-name">${user.name.split(" ")[0]}</span></span>
       <button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>`
    : `<a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>
       <a href="register.html" class="btn btn-ghost btn-sm">Register</a>`
  ) + `<a href="index.html#searchForm" class="btn btn-accent btn-sm">Book Your Trip →</a>`;

  document.getElementById("site-header").innerHTML = `
    <div class="container">
      <a href="index.html" class="brand">${BRAND_MARK_SVG} Gachok</a>
      <nav class="nav-links" id="siteNavigation" aria-label="Primary navigation">${linkHtml}</nav>
      <div class="header-actions">${actionsHtml}</div>
      <button type="button" class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="siteNavigation">☰</button>
    </div>
  `;

  const signOut = document.getElementById("signOutBtn");
  if (signOut) signOut.addEventListener("click", () => { clearSession(); window.location.href = "index.html"; });

  const toggle = document.getElementById("navToggle");
  if (toggle) toggle.addEventListener("click", () => {
    const nav = document.querySelector(".nav-links");
    if (!nav) return;
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  // Close the mobile menu after selecting a link or returning to desktop width.
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      const nav = document.querySelector(".nav-links");
      if (nav) nav.classList.remove("is-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      const nav = document.querySelector(".nav-links");
      if (nav) nav.classList.remove("is-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    }
  });
}

function renderFooter() {
  document.getElementById("site-footer").innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <a href="index.html" class="brand" style="color:#fff; margin-bottom:14px; display:inline-flex;">${BRAND_MARK_SVG} Gachok</a>
          <p>We're committed to providing safe, comfortable and reliable shuttle transportation across Nigeria.</p>
          <p style="margin-bottom:0;">Fleet Reg. BR-2016</p>
          <div class="footer-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="Instagram">◎</a>
            <a href="#" aria-label="LinkedIn">in</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="services.html">Services</a></li>
            <li><a href="search.html">Routes</a></li>
            <li><a href="bookings.html">My bookings</a></li>

          </ul>
        </div>
        <div class="footer-col">
          <h4>Our Services</h4>
          <ul>
            <li><a href="services.html#passenger">Passenger Transport</a></li>
            <li><a href="services.html#charter">Charter Services</a></li>
            <li><a href="services.html#staff">Staff Transportation</a></li>
            <li><a href="services.html#airport">Airport Transfers</a></li>
            <li><a href="services.html#logistics">Logistics Services</a></li>
          </ul>
        </div>
         <div class="footer-col">
         
          <h4>Contact us</h4>
          <ul>
            <li style= "display:flex; align-items:center; gap:4px;">
            <svg fill= "#2A3E63" width= "25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 252.6C128 148.4 214 64 320 64C426 64 512 148.4 512 252.6C512 371.9 391.8 514.9 341.6 569.4C329.8 582.2 310.1 582.2 298.3 569.4C248.1 514.9 127.9 371.9 127.9 252.6zM320 320C355.3 320 384 291.3 384 256C384 220.7 355.3 192 320 192C284.7 192 256 220.7 256 256C256 291.3 284.7 320 320 320z"/></svg>
            <span class="sub-icon" id="walk"></span>No. 4 Anambra street,<Br>Ekwulobia, Anambra State</a></li>
            <li style= "display:flex; align-items:center; gap:4px;">
            <svg fill= "#2A3E63" width= "25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M224.2 89C216.3 70.1 195.7 60.1 176.1 65.4L170.6 66.9C106 84.5 50.8 147.1 66.9 223.3C104 398.3 241.7 536 416.7 573.1C493 589.3 555.5 534 573.1 469.4L574.6 463.9C580 444.2 569.9 423.6 551.1 415.8L453.8 375.3C437.3 368.4 418.2 373.2 406.8 387.1L368.2 434.3C297.9 399.4 241.3 341 208.8 269.3L253 233.3C266.9 222 271.6 202.9 264.8 186.3L224.2 89z"/></svg>
            <span class="sub-icon" data-icon="headset"><a href="tel:+2348012345678">+234 801 234 5678</a><br></li>
            <li style= "display:flex; align-items:center; gap:4px;">
            <svg width="25" fill= "#2A3E63"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/></svg>
            <span class="sub-icon" data-icon="shield"><a href="services.html#staff">INFO@gachoktransport.com</a></li>
            <li style= "display:flex; align-items:center; gap:4px;">
            <svg width = "25" fill= "#2A3E63" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/></svg>
            <span class="sub-icon" data-icon="clock"><span class="top-bar-hours">Mon – Sun: 6:00AM – 9:00PM </span></li>
          </ul>
         </div>
        <div class="footer-col">
          <h4>Newsletter</h4>
          <p>Subscribe to get schedule updates and fare alerts.</p>
          <form class="newsletter-form" id="newsletterForm">
            <input type="email" placeholder="Your email address" required>
            <button type="submit" class="btn btn-accent btn-sm">Join</button>
          </form>
          <p class="newsletter-note" id="newsletterNote"></p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 Gachok Transport Ltd. All Rights RReserved.</span>
        <span>No real payments are processed. Simulation only.</span>
      </div>
    </div>
  `;

  const nlForm = document.getElementById("newsletterForm");
  if (nlForm) nlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("newsletterNote").textContent = "You're subscribed. Thanks!";
    nlForm.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureSeeded();
  const path = window.location.pathname.split("/").pop() || "index.html";
  renderTopBar();
  renderHeader(path);
  renderFooter();
});
