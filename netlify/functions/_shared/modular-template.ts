import type { Dossier } from "./dossier";
import type {
  SiteSpec,
  HeroSection,
  StorySection,
  FeaturesSection,
  GallerySection,
  OfferingsSection,
  ReviewsSection,
  ContactSection,
} from "./site-spec";
import { paletteById, paletteCssVars } from "./palettes";

export interface SiteData {
  place_id?: string;
  google_maps_uri?: string;
  address: string;
  phones: { mobiles: string[]; landlines: string[]; display: string[] };
  opening_hours?: string[];
  photo_urls: string[];
  reviews: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }>;
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function waUrl(mobile: string | undefined, greeting: string): string {
  if (!mobile) return "#wa-placeholder";
  const digits = mobile.replace(/\D+/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;
}

function firstPhone(phones: SiteData["phones"]): string | undefined {
  return phones.mobiles[0] ?? phones.landlines[0] ?? phones.display[0];
}

function mapsSrc(place_id?: string, address?: string): string {
  if (place_id) return `https://www.google.com/maps/embed/v1/place?key=&q=place_id:${place_id}`;
  if (address) return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return "";
}

function renderHero(s: HeroSection, d: Dossier, data: SiteData): string {
  const heroImg = data.photo_urls[0];
  const heroBg = heroImg
    ? `background-image: var(--hero-overlay), url(${esc(heroImg)});`
    : `background: linear-gradient(135deg, var(--accent) 0%, var(--heading) 100%);`;
  const mobile = data.phones.mobiles[0];
  const greeting = `Hi! I found you via ${esc(d.name)} and would like to ask a question.`;
  const dirUrl = d.name
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.name + " " + data.address)}${data.place_id ? `&destination_place_id=${data.place_id}` : ""}`
    : "#";
  return `
  <section class="hero" style="${heroBg}">
    <div class="hero-inner">
      <h1 class="hero-heading">${esc(s.heading)}</h1>
      <p class="hero-sub">${esc(s.subhead)}</p>
      <div class="hero-ctas">
        ${firstPhone(data.phones) ? `<a class="btn btn-primary" href="tel:${esc(firstPhone(data.phones))}">${esc(s.cta_primary ?? "Call Us")}</a>` : ""}
        <a class="btn btn-ghost" href="${esc(dirUrl)}" target="_blank" rel="noopener">${esc(s.cta_secondary ?? "Directions")}</a>
        ${mobile ? `<a class="btn btn-ghost" href="${waUrl(mobile, greeting)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
      </div>
    </div>
  </section>`;
}

function renderStory(s: StorySection, d: Dossier, data: SiteData): string {
  const side = s.image_side ?? "right";
  const image = data.photo_urls[1] || data.photo_urls[0];
  const body = esc(s.body).replace(/\n\n/g, "</p><p>");
  return `
  <section class="story story-${side}">
    <div class="story-inner">
      <div class="story-text">
        <h2 class="section-heading">${esc(s.heading)}</h2>
        <p>${body}</p>
      </div>
      ${side !== "none" && image ? `<div class="story-image" style="background-image:url(${esc(image)})"></div>` : ""}
    </div>
  </section>`;
}

function renderFeatures(s: FeaturesSection): string {
  return `
  <section class="features">
    <div class="features-inner">
      ${s.heading ? `<h2 class="section-heading">${esc(s.heading)}</h2>` : ""}
      ${s.intro ? `<p class="features-intro">${esc(s.intro)}</p>` : ""}
      <div class="features-grid">
        ${s.items
          .map(
            (i) => `
        <div class="feature-card">
          <h3>${esc(i.heading)}</h3>
          <p>${esc(i.body)}</p>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderGallery(s: GallerySection, data: SiteData): string {
  const photos = data.photo_urls.slice(0, 8);
  if (photos.length === 0) return "";
  return `
  <section class="gallery">
    <div class="gallery-inner">
      ${s.heading ? `<h2 class="section-heading">${esc(s.heading)}</h2>` : ""}
      ${s.caption ? `<p class="gallery-caption">${esc(s.caption)}</p>` : ""}
      <div class="gallery-grid">
        ${photos.map((p) => `<div class="gallery-item" style="background-image:url(${esc(p)})"></div>`).join("")}
      </div>
    </div>
  </section>`;
}

function renderOfferings(s: OfferingsSection): string {
  const cls = `offerings offerings-${s.kind}`;
  return `
  <section class="${cls}">
    <div class="offerings-inner">
      <h2 class="section-heading">${esc(s.heading)}</h2>
      ${s.intro ? `<p class="offerings-intro">${esc(s.intro)}</p>` : ""}
      <div class="offerings-list">
        ${s.items
          .map(
            (i) => `
        <div class="offering-card">
          <div class="offering-head">
            <span class="offering-name">${esc(i.name)}</span>
            ${i.meta ? `<span class="offering-meta">${esc(i.meta)}</span>` : ""}
          </div>
          ${i.description ? `<p class="offering-desc">${esc(i.description)}</p>` : ""}
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderReviews(s: ReviewsSection, data: SiteData): string {
  const reviews = (data.reviews ?? []).filter((r) => r.text).slice(0, 4);
  if (reviews.length === 0) return "";
  return `
  <section class="reviews">
    <div class="reviews-inner">
      <h2 class="section-heading">${esc(s.heading ?? "What Guests Say")}</h2>
      <div class="reviews-grid">
        ${reviews
          .map(
            (r) => `
        <blockquote class="review">
          <p>"${esc((r.text ?? "").slice(0, 240))}"</p>
          <cite>— ${esc(r.author ?? "Google reviewer")}${r.rating ? ` · ${r.rating.toFixed(1)}★` : ""}</cite>
        </blockquote>`,
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderContact(s: ContactSection, d: Dossier, data: SiteData): string {
  const phones = [...data.phones.mobiles, ...data.phones.landlines].slice(0, 3);
  const hours = (data.opening_hours ?? []).slice(0, 7);
  const map = mapsSrc(data.place_id, data.address);
  return `
  <section class="contact">
    <div class="contact-inner">
      <h2 class="section-heading">${esc(s.heading ?? "Visit Us")}</h2>
      ${s.closer ? `<p class="contact-closer">${esc(s.closer)}</p>` : ""}
      <div class="contact-grid">
        <div class="contact-card">
          <!-- EDIT: phone numbers -->
          <div class="contact-row"><span class="lbl">Address</span><span>${esc(data.address)}</span></div>
          ${phones.length ? `<div class="contact-row"><span class="lbl">Phone</span><span>${phones.map((p) => `<a href="tel:${esc(p)}">${esc(p)}</a>`).join("<br>")}</span></div>` : ""}
          ${hours.length ? `<div class="contact-row"><span class="lbl">Hours</span><span>${hours.map(esc).join("<br>")}</span></div>` : ""}
          ${d.social.instagram ? `<div class="contact-row"><span class="lbl">Instagram</span><span><a href="${esc(d.social.instagram.startsWith("http") ? d.social.instagram : "https://instagram.com/" + d.social.instagram.replace(/^@/, ""))}" target="_blank" rel="noopener">${esc(d.social.instagram)}</a></span></div>` : ""}
          ${d.social.facebook ? `<div class="contact-row"><span class="lbl">Facebook</span><span><a href="${esc(d.social.facebook)}" target="_blank" rel="noopener">Facebook page</a></span></div>` : ""}
        </div>
        ${map ? `<div class="contact-map"><iframe src="${esc(map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ""}
      </div>
    </div>
  </section>`;
}

function renderSection(s: SiteSpec["sections"][number], d: Dossier, data: SiteData): string {
  switch (s.type) {
    case "hero":
      return renderHero(s, d, data);
    case "story":
      return renderStory(s, d, data);
    case "features":
      return renderFeatures(s);
    case "gallery":
      return renderGallery(s, data);
    case "offerings":
      return renderOfferings(s);
    case "reviews":
      return renderReviews(s, data);
    case "contact":
      return renderContact(s, d, data);
  }
}

function buildCss(paletteVars: string): string {
  return `
:root {
  ${paletteVars}
  --max-w: 1200px;
  --radius-sm: 6px;
  --radius: 12px;
  --radius-lg: 20px;
  --shadow-soft: 0 8px 32px rgba(0,0,0,0.08);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--body-font);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 {
  font-family: var(--heading-font);
  color: var(--heading);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  margin: 0 0 0.5em 0;
  line-height: 1.15;
}
p { margin: 0 0 1em 0; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Hero */
.hero {
  min-height: 78vh;
  background-size: cover;
  background-position: center;
  display: grid;
  align-items: end;
  padding: 0;
  color: #fff;
}
.hero-inner {
  max-width: var(--max-w);
  width: 100%;
  margin: 0 auto;
  padding: 80px 32px 56px;
}
.hero-heading {
  font-size: clamp(40px, 6.5vw, 76px);
  color: #fff;
  margin: 0 0 12px 0;
}
.hero-sub {
  font-size: clamp(16px, 1.6vw, 22px);
  max-width: 640px;
  opacity: 0.94;
  margin: 0 0 28px 0;
}
.hero-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 22px;
  border-radius: var(--radius-sm);
  font-weight: 600; font-size: 14px;
  letter-spacing: 0.02em;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none !important;
  transition: transform 0.15s, background 0.15s;
}
.btn-primary { background: var(--accent); color: var(--accent-contrast); }
.btn-primary:hover { transform: translateY(-1px); }
.btn-ghost { border-color: rgba(255,255,255,0.45); color: #fff; background: rgba(255,255,255,0.08); }
.btn-ghost:hover { background: rgba(255,255,255,0.18); }

/* Section base */
section {
  padding: 88px 32px;
}
.section-heading {
  font-size: clamp(28px, 3.2vw, 44px);
  margin-bottom: 24px;
}
.features-inner, .gallery-inner, .offerings-inner, .reviews-inner, .contact-inner, .story-inner {
  max-width: var(--max-w);
  margin: 0 auto;
}

/* Alternating bg for readability */
section:nth-of-type(odd) { background: var(--bg); }
section:nth-of-type(even) { background: var(--bg-alt); }
.hero { background-color: var(--heading); }

/* Story */
.story-inner {
  display: grid;
  gap: 48px;
  align-items: center;
}
.story-right .story-inner { grid-template-columns: 1fr 1fr; }
.story-left .story-inner { grid-template-columns: 1fr 1fr; }
.story-left .story-image { order: -1; }
.story-none .story-inner { grid-template-columns: 1fr; max-width: 780px; }
.story-text p { font-size: 17px; color: var(--text); }
.story-image {
  width: 100%;
  min-height: 360px;
  background-size: cover; background-position: center;
  border-radius: var(--radius);
  box-shadow: var(--shadow-soft);
}

/* Features */
.features-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
}
.feature-card h3 { font-size: 18px; margin-bottom: 8px; }
.feature-card p { margin: 0; color: var(--text-muted); font-size: 14px; }
.features-intro { max-width: 680px; color: var(--text-muted); margin-bottom: 32px; font-size: 16px; }

/* Gallery */
.gallery-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.gallery-item {
  aspect-ratio: 1 / 1;
  background-size: cover; background-position: center;
  border-radius: var(--radius-sm);
}
.gallery-caption { color: var(--text-muted); max-width: 680px; margin-bottom: 24px; }

/* Offerings */
.offerings-list {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.offering-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 22px;
}
.offering-head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 12px; margin-bottom: 4px;
}
.offering-name { font-weight: 600; color: var(--heading); font-size: 16px; }
.offering-meta { color: var(--accent); font-weight: 600; font-size: 14px; }
.offering-desc { margin: 0; color: var(--text-muted); font-size: 14px; }
.offerings-intro { color: var(--text-muted); max-width: 680px; margin-bottom: 28px; }

/* Reviews */
.reviews-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.review {
  background: var(--surface);
  border-left: 3px solid var(--accent);
  padding: 20px 22px;
  margin: 0;
  border-radius: 0 var(--radius) var(--radius) 0;
}
.review p { font-style: italic; color: var(--text); margin-bottom: 10px; font-size: 15px; }
.review cite { color: var(--text-muted); font-size: 13px; font-style: normal; }

/* Contact */
.contact-grid {
  display: grid; gap: 24px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 780px) {
  .contact-grid { grid-template-columns: 1fr; }
  .story-right .story-inner, .story-left .story-inner { grid-template-columns: 1fr; }
  .story-left .story-image { order: 0; }
}
.contact-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
}
.contact-row { display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.contact-row:last-child { border-bottom: none; }
.contact-row .lbl { color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.contact-map iframe { width: 100%; height: 100%; min-height: 300px; border: 0; border-radius: var(--radius); }
.contact-closer { color: var(--text-muted); max-width: 680px; margin-bottom: 24px; }

/* WhatsApp floating button */
.wa-float {
  position: fixed; right: 20px; bottom: 20px;
  width: 56px; height: 56px; border-radius: 50%;
  background: #25D366;
  display: grid; place-items: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  text-decoration: none !important;
  z-index: 999;
}
.wa-float svg { width: 28px; height: 28px; fill: #fff; }

/* Footer */
.site-footer {
  padding: 36px 32px;
  text-align: center;
  background: var(--bg-alt);
  color: var(--text-muted);
  font-size: 13px;
  border-top: 1px solid var(--border);
}
`.trim();
}

export function buildModularSite(opts: {
  dossier: Dossier;
  spec: SiteSpec;
  data: SiteData;
}): string {
  const palette = paletteById(opts.spec.palette_id);
  const css = buildCss(paletteCssVars(palette));

  const sections = opts.spec.sections.map((s) => renderSection(s, opts.dossier, opts.data)).join("\n");

  const mobile = opts.data.phones.mobiles[0];
  const waGreeting = `Hi! I found you via ${opts.dossier.name} and would like to ask a question.`;
  const waFloat = mobile
    ? `<a class="wa-float" href="${waUrl(mobile, waGreeting)}" target="_blank" rel="noopener" aria-label="WhatsApp">
         <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.427.717 4.686 1.949 6.586L4 29l7.566-1.923A11.95 11.95 0 0 0 16.001 27C22.627 27 28 21.627 28 15S22.627 3 16.001 3Zm0 21.6c-1.818 0-3.516-.49-4.982-1.34l-.358-.212-4.49 1.141 1.2-4.376-.233-.38A9.577 9.577 0 0 1 6.4 15c0-5.298 4.303-9.6 9.6-9.6 5.298 0 9.6 4.302 9.6 9.6 0 5.297-4.302 9.6-9.6 9.6Zm5.435-7.185c-.298-.149-1.763-.87-2.037-.969-.273-.1-.472-.149-.67.149-.198.298-.767.969-.94 1.168-.173.199-.346.224-.644.075-.298-.149-1.258-.463-2.396-1.477-.886-.79-1.484-1.766-1.657-2.064-.173-.298-.018-.459.13-.607.133-.132.298-.346.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.074-.149-.67-1.614-.917-2.21-.242-.58-.487-.501-.67-.51l-.57-.01c-.198 0-.52.074-.792.372-.273.298-1.04 1.016-1.04 2.48 0 1.464 1.066 2.878 1.214 3.077.149.198 2.097 3.2 5.08 4.487.71.306 1.264.489 1.695.627.712.226 1.36.194 1.873.118.571-.085 1.763-.72 2.01-1.416.248-.695.248-1.29.174-1.415-.074-.124-.273-.198-.571-.347Z"/></svg>
       </a>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.dossier.name)}</title>
<meta name="description" content="${esc(opts.dossier.brand_identity.unique_story).slice(0, 160)}">
<style>${css}</style>
</head>
<body>
${sections}
<footer class="site-footer">
  <div>${esc(opts.dossier.name)} · ${esc(opts.data.address)}</div>
  <div style="margin-top:6px; opacity:0.7">Mock website — not yet published</div>
</footer>
${waFloat}
</body>
</html>`;
}
