import { SECTOR_THEMES, type Sector } from "./sectors";
import { waDigits } from "./phones";

export interface TemplateBusiness {
  name: string;
  sector: Sector;
  address: string;
  formatted_address?: string;
  place_id?: string;
  google_maps_uri?: string;
  phones: { mobiles: string[]; landlines: string[]; display: string[] };
  opening_hours?: string[];
  rating?: number;
  user_ratings_total?: number;
  reviews: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }>;
  editorial_summary?: string;
  photo_urls: string[]; // resolved URLs for use in <img>
  seasonal_note?: string;
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function servicesMarkup(b: TemplateBusiness): string {
  const theme = SECTOR_THEMES[b.sector];
  if (theme.hasMenu) {
    // Menu stub — owner-editable categories/items
    return `
      <!-- MENU SECTION — edit items below to update the menu. Owner-friendly structure. -->
      <section id="menu" class="section">
        <div class="container">
          <h2 class="section-title">${esc(theme.servicesLabel)}</h2>
          <p class="section-sub">Sample menu placeholder — owner should replace with real items & prices.</p>
          <div class="menu-grid">
            <div class="menu-cat">
              <h3>Starters</h3>
              <ul class="menu-list">
                <li><span>Greek salad</span><span class="price">€9.50</span></li>
                <li><span>Tzatziki with pita</span><span class="price">€5.50</span></li>
                <li><span>Grilled octopus</span><span class="price">€14.00</span></li>
              </ul>
            </div>
            <div class="menu-cat">
              <h3>Mains</h3>
              <ul class="menu-list">
                <li><span>Catch of the day (per kg)</span><span class="price">mkt</span></li>
                <li><span>Slow-cooked lamb</span><span class="price">€18.50</span></li>
                <li><span>Moussaka</span><span class="price">€13.00</span></li>
              </ul>
            </div>
            <div class="menu-cat">
              <h3>Desserts</h3>
              <ul class="menu-list">
                <li><span>Homemade baklava</span><span class="price">€6.00</span></li>
                <li><span>Greek yoghurt & honey</span><span class="price">€5.00</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>`;
  }
  if (theme.hasRooms) {
    return `
      <!-- ROOMS SECTION — edit to match real rooms / suites. -->
      <section id="rooms" class="section">
        <div class="container">
          <h2 class="section-title">${esc(theme.servicesLabel)}</h2>
          <div class="card-grid">
            <article class="card">
              <div class="card-img">${photoImg(b.photo_urls[1])}</div>
              <div class="card-body">
                <h3>Classic Room</h3>
                <p>Sleeps 2 · Garden view · 22 m²</p>
              </div>
            </article>
            <article class="card">
              <div class="card-img">${photoImg(b.photo_urls[2])}</div>
              <div class="card-body">
                <h3>Sea-view Suite</h3>
                <p>Sleeps 2–3 · Sea view · 35 m²</p>
              </div>
            </article>
            <article class="card">
              <div class="card-img">${photoImg(b.photo_urls[3])}</div>
              <div class="card-body">
                <h3>Family Studio</h3>
                <p>Sleeps 4 · Kitchenette · 40 m²</p>
              </div>
            </article>
          </div>
        </div>
      </section>`;
  }
  // Generic services (car rentals, boutique, beauty, etc.)
  return `
    <!-- SERVICES SECTION — owner should edit to real offerings. -->
    <section id="services" class="section">
      <div class="container">
        <h2 class="section-title">${esc(theme.servicesLabel)}</h2>
        <div class="card-grid">
          <article class="card">
            <div class="card-body">
              <h3>Offering one</h3>
              <p>Short description of this ${esc(theme.servicesSingular)}.</p>
            </div>
          </article>
          <article class="card">
            <div class="card-body">
              <h3>Offering two</h3>
              <p>Short description of this ${esc(theme.servicesSingular)}.</p>
            </div>
          </article>
          <article class="card">
            <div class="card-body">
              <h3>Offering three</h3>
              <p>Short description of this ${esc(theme.servicesSingular)}.</p>
            </div>
          </article>
        </div>
      </div>
    </section>`;
}

function photoImg(url: string | undefined, alt = ""): string {
  if (!url) {
    return `<div class="img-placeholder" aria-hidden="true">📷</div>`;
  }
  return `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" />`;
}

function reviewsMarkup(b: TemplateBusiness): string {
  const trimmed = b.reviews.slice(0, 3).filter((r) => r.text && r.text.length > 10);
  if (trimmed.length === 0) return "";
  return `
    <section class="section reviews-section">
      <div class="container">
        <h2 class="section-title">What guests say</h2>
        <div class="reviews-grid">
          ${trimmed
            .map(
              (r) => `
            <figure class="review">
              <blockquote>“${esc((r.text ?? "").slice(0, 220))}${(r.text ?? "").length > 220 ? "…" : ""}”</blockquote>
              <figcaption>— ${esc(r.author ?? "Google reviewer")}${r.rating ? ` · ★ ${r.rating}` : ""}</figcaption>
            </figure>`,
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

function gallery(b: TemplateBusiness): string {
  const pics = b.photo_urls.slice(0, 8);
  if (pics.length === 0) {
    return `
      <section id="gallery" class="section section-dark">
        <div class="container">
          <h2 class="section-title">Gallery</h2>
          <div class="gallery-grid">
            ${Array.from({ length: 6 })
              .map(() => `<div class="gallery-item img-placeholder">📷</div>`)
              .join("")}
          </div>
        </div>
      </section>`;
  }
  return `
    <section id="gallery" class="section section-dark">
      <div class="container">
        <h2 class="section-title">Gallery</h2>
        <div class="gallery-grid">
          ${pics.map((u) => `<div class="gallery-item">${photoImg(u, b.name)}</div>`).join("")}
        </div>
      </div>
    </section>`;
}

export function buildTemplateSite(b: TemplateBusiness): string {
  const theme = SECTOR_THEMES[b.sector];
  const tel = b.phones.display[0] ?? "";
  const telHref = tel ? `tel:${tel.replace(/\s+/g, "")}` : "";
  const wa = b.phones.mobiles[0] ?? "";
  const waHref = wa ? `https://wa.me/${waDigits(wa)}` : "";
  const mapsHref =
    b.google_maps_uri ||
    (b.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(b.place_id)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + " " + (b.formatted_address || b.address))}`);

  const hero = b.photo_urls[0];
  const about = b.editorial_summary
    || `${b.name} — ${theme.tagline} This website was generated as a proposal. Replace this text, swap the photos, and update menu/services as needed.`;

  const hoursList = (b.opening_hours ?? []).map((h) => `<li>${esc(h)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(b.name)} — ${esc(theme.label)}</title>
<meta name="description" content="${esc(b.name)} — ${esc(theme.tagline)} Located at ${esc(b.formatted_address || b.address)}." />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: ${theme.primary};
    --primary-dark: ${theme.primaryDark};
    --accent: ${theme.accent};
    --bg-tint: ${theme.bgTint};
    --text: #1a1a1a;
    --text-muted: #555;
    --surface: #ffffff;
    --radius: 14px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text);
    background: var(--surface);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: 'Cormorant Garamond', 'Georgia', serif; font-weight: 600; letter-spacing: 0.01em; }
  a { color: var(--primary); text-decoration: none; }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }

  /* Header / Nav */
  header.site-header {
    position: fixed; inset: 0 0 auto 0; z-index: 50;
    background: rgba(255,255,255,0.92);
    backdrop-filter: saturate(1.3) blur(8px);
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; max-width: 1100px; margin: 0 auto;
  }
  .logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--primary); }
  .nav ul { list-style: none; display: flex; gap: 22px; margin: 0; padding: 0; }
  .nav a { color: #222; font-size: 14px; font-weight: 500; }
  .nav a:hover { color: var(--primary); }
  @media (max-width: 640px) { .nav ul { display: none; } }

  /* Hero */
  .hero {
    position: relative; min-height: 88vh; display: flex; align-items: flex-end;
    overflow: hidden; color: #fff;
  }
  .hero-bg {
    position: absolute; inset: 0; overflow: hidden;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  }
  .hero-bg img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center;
    display: block; filter: brightness(0.82);
  }
  .hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 30%, ${theme.heroOverlay} 100%);
  }
  .hero-content {
    position: relative; padding: 120px 20px 60px; max-width: 1100px; margin: 0 auto; width: 100%;
  }
  .hero-content h1 { font-size: clamp(40px, 7vw, 76px); line-height: 1.05; margin: 0 0 12px 0; }
  .hero-content p.tagline { font-size: clamp(16px, 2vw, 20px); max-width: 640px; opacity: 0.95; }
  .cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
  .btn {
    display: inline-block; padding: 12px 22px; border-radius: 999px;
    font-weight: 600; font-size: 14px; letter-spacing: 0.02em;
    border: 1.5px solid transparent; transition: all 0.2s; cursor: pointer;
    text-decoration: none;
  }
  .btn-primary { background: var(--accent); color: #111; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.15); }
  .btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,0.6); }
  .btn-ghost:hover { background: rgba(255,255,255,0.12); }

  /* Sections */
  .section { padding: 80px 0; }
  .section-dark { background: var(--bg-tint); }
  .section-title { font-size: clamp(28px, 4vw, 42px); margin: 0 0 10px 0; color: var(--primary-dark); }
  .section-sub { color: var(--text-muted); margin: 0 0 28px 0; }

  /* About */
  .about-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
  }
  .about-grid p { font-size: 17px; }
  .about-img { border-radius: var(--radius); overflow: hidden; aspect-ratio: 4/3; }
  .about-img img, .about-img .img-placeholder {
    width: 100%; height: 100%; object-fit: cover; object-position: center;
  }
  @media (max-width: 800px) { .about-grid { grid-template-columns: 1fr; } }

  /* Menu */
  .menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
  .menu-cat h3 { color: var(--primary-dark); font-size: 24px; border-bottom: 2px solid var(--accent); padding-bottom: 6px; margin: 0 0 12px 0; }
  .menu-list { list-style: none; padding: 0; margin: 0; }
  .menu-list li {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.08);
    font-size: 15px;
  }
  .menu-list .price { color: var(--primary); font-weight: 600; white-space: nowrap; }
  @media (max-width: 800px) { .menu-grid { grid-template-columns: 1fr; } }

  /* Cards (rooms/services) */
  .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .card {
    background: #fff; border-radius: var(--radius); overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.04);
  }
  .card-img { aspect-ratio: 4/3; overflow: hidden; background: #eee; }
  .card-img img, .card-img .img-placeholder {
    width: 100%; height: 100%; object-fit: cover; object-position: center;
  }
  .card-body { padding: 16px 18px; }
  .card-body h3 { margin: 0 0 6px 0; font-size: 22px; color: var(--primary-dark); }
  .card-body p { margin: 0; color: var(--text-muted); font-size: 14px; }
  @media (max-width: 800px) { .card-grid { grid-template-columns: 1fr; } }

  /* Gallery */
  .gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .gallery-item {
    aspect-ratio: 1/1; overflow: hidden; border-radius: 10px; background: #e8e8e8;
  }
  .gallery-item img, .gallery-item.img-placeholder {
    width: 100%; height: 100%; object-fit: cover; object-position: center; display: grid; place-items: center;
    font-size: 32px; color: #bbb;
  }
  @media (max-width: 800px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }

  /* Reviews */
  .reviews-section { background: var(--primary-dark); color: #fff; }
  .reviews-section .section-title { color: #fff; }
  .reviews-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .review {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    border-radius: var(--radius); padding: 20px; margin: 0;
  }
  .review blockquote { margin: 0 0 12px 0; font-style: italic; font-size: 15px; }
  .review figcaption { color: rgba(255,255,255,0.75); font-size: 13px; }
  @media (max-width: 800px) { .reviews-grid { grid-template-columns: 1fr; } }

  /* Contact */
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .contact-card {
    background: #fff; border-radius: var(--radius); padding: 28px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.04);
  }
  .contact-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); align-items: flex-start; }
  .contact-row:last-child { border-bottom: none; }
  .contact-row .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); min-width: 90px; }
  .contact-row .val { flex: 1; font-size: 15px; }
  .map-embed { aspect-ratio: 16/10; border-radius: var(--radius); overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }
  .map-embed iframe { width: 100%; height: 100%; border: 0; display: block; }
  @media (max-width: 800px) { .contact-grid { grid-template-columns: 1fr; } }

  /* Footer */
  footer.site-footer { background: var(--primary-dark); color: rgba(255,255,255,0.8); padding: 30px 0; text-align: center; font-size: 13px; }

  /* Floating WhatsApp */
  .wa-fab {
    position: fixed; bottom: 22px; right: 22px; z-index: 100;
    background: #25d366; color: #fff; width: 58px; height: 58px;
    border-radius: 50%; display: grid; place-items: center;
    box-shadow: 0 8px 24px rgba(37, 211, 102, 0.45);
    text-decoration: none; transition: transform 0.2s;
  }
  .wa-fab:hover { transform: scale(1.05); }
  .wa-fab svg { width: 30px; height: 30px; fill: #fff; }

  /* Placeholder */
  .img-placeholder {
    display: grid; place-items: center;
    background: linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.10));
    color: #999; font-size: 36px;
    width: 100%; height: 100%;
  }
</style>
</head>
<body>

<!-- NAV — update link text as needed -->
<header class="site-header">
  <div class="nav">
    <div class="logo">${esc(b.name)}</div>
    <ul>
      <li><a href="#about">About</a></li>
      ${theme.hasMenu ? '<li><a href="#menu">Menu</a></li>' : theme.hasRooms ? '<li><a href="#rooms">Rooms</a></li>' : '<li><a href="#services">Services</a></li>'}
      <li><a href="#gallery">Gallery</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </div>
</header>

<!-- HERO — swap hero image by replacing the img src -->
<section class="hero">
  <div class="hero-bg">
    ${photoImg(hero, b.name)}
  </div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <h1>${esc(b.name)}</h1>
    <p class="tagline">${esc(b.editorial_summary || theme.tagline)}</p>
    <div class="cta-row">
      ${telHref ? `<a class="btn btn-primary" href="${esc(telHref)}">Call now</a>` : ""}
      <a class="btn btn-ghost" href="${esc(mapsHref)}" target="_blank" rel="noopener">Get directions</a>
      ${waHref ? `<a class="btn btn-ghost" href="${esc(waHref)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    </div>
  </div>
</section>

<!-- ABOUT — owner should edit paragraph below -->
<section id="about" class="section">
  <div class="container">
    <div class="about-grid">
      <div>
        <h2 class="section-title">${esc(theme.aboutHeading)}</h2>
        <p>${esc(about)}</p>
        ${b.seasonal_note ? `<p><em>${esc(b.seasonal_note)}</em></p>` : ""}
      </div>
      <div class="about-img">${photoImg(b.photo_urls[1] ?? b.photo_urls[0], b.name)}</div>
    </div>
  </div>
</section>

${servicesMarkup(b)}

${gallery(b)}

${reviewsMarkup(b)}

<!-- CONTACT — update address, phones, hours -->
<section id="contact" class="section section-dark">
  <div class="container">
    <h2 class="section-title">Visit &amp; contact</h2>
    <div class="contact-grid">
      <div class="contact-card">
        <div class="contact-row">
          <span class="label">Address</span>
          <span class="val">${esc(b.formatted_address || b.address)}</span>
        </div>
        ${b.phones.mobiles.length ? `<div class="contact-row"><span class="label">Mobile</span><span class="val">${b.phones.mobiles.map((m) => `<a href="tel:${esc(m.replace(/\s+/g, ""))}">${esc(m)}</a>`).join("<br/>")}</span></div>` : ""}
        ${b.phones.landlines.length ? `<div class="contact-row"><span class="label">Landline</span><span class="val">${b.phones.landlines.map((l) => `<a href="tel:${esc(l.replace(/\s+/g, ""))}">${esc(l)}</a>`).join("<br/>")}</span></div>` : ""}
        ${hoursList ? `<div class="contact-row"><span class="label">Hours</span><span class="val"><ul style="margin:0;padding-left:16px;">${hoursList}</ul></span></div>` : ""}
        <div class="contact-row">
          <span class="label">Directions</span>
          <span class="val"><a href="${esc(mapsHref)}" target="_blank" rel="noopener">Open in Google Maps →</a></span>
        </div>
      </div>
      <div class="map-embed">
        <iframe
          src="https://www.google.com/maps?q=${encodeURIComponent(b.formatted_address || b.name + " " + b.address)}&output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Map to ${esc(b.name)}"
          allowfullscreen></iframe>
      </div>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div class="container">
    © ${new Date().getFullYear()} ${esc(b.name)}. All rights reserved. — Website proposal by SitePilot.
  </div>
</footer>

${
  waHref
    ? `<!-- Floating WhatsApp button — uses mobile number. -->
<a class="wa-fab" href="${esc(waHref)}" target="_blank" rel="noopener" aria-label="WhatsApp">
  <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.29c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.16-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.02-.22-.52-.44-.45-.61-.46-.16-.01-.34-.01-.52-.01s-.48.07-.73.34c-.25.27-.95.93-.95 2.27 0 1.34.97 2.64 1.11 2.82.14.18 1.91 2.92 4.63 4.09.65.28 1.15.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32zM16 3C9.37 3 4 8.37 4 15c0 2.35.68 4.53 1.86 6.38L4 29l7.82-2.05A11.93 11.93 0 0 0 16 27c6.63 0 12-5.37 12-12S22.63 3 16 3zm0 21.75c-1.76 0-3.41-.48-4.83-1.31l-.35-.21-4.13 1.08 1.11-4.03-.23-.37A9.73 9.73 0 1 1 25.75 15 9.76 9.76 0 0 1 16 24.75z"/></svg>
</a>`
    : `<!-- WARNING: No public mobile number found. Replace href below before publishing. -->
<a class="wa-fab" href="https://wa.me/REPLACE_WITH_MOBILE" aria-label="WhatsApp">
  <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9.37 3 4 8.37 4 15c0 2.35.68 4.53 1.86 6.38L4 29l7.82-2.05A11.93 11.93 0 0 0 16 27c6.63 0 12-5.37 12-12S22.63 3 16 3z"/></svg>
</a>`
}

</body>
</html>`;
}
