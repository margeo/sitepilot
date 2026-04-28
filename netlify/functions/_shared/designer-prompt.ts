// System prompt for the free-form site designer — LEAN version (active
// since 2026-04-28). ~2,400 chars. Mirrors the 5-step thinking checklist
// Claude actually runs internally regardless of how verbose the prompt
// is (visible in its reasoning when building Mykonos 22 / Taverna
// Alexandros / Dream Sea Moschou).
//
// The previous verbose ~7,800-char prompt (with the Anthropic
// frontend-design skill text pasted inline) lives in CLAUDE.md under
// "Designer prompt — LEGACY (verbose) version". To revert, copy that
// content back here as constants and re-export.

import type { Dossier } from "./dossier";

const SITEPILOT_PROMPT_LEAN = `Build a complete production-grade single-file HTML website for a small Greek tourism business.

Apply your frontend-design skill if you have it loaded
(github.com/anthropics/skills/tree/main/skills/frontend-design).

Before coding, commit to:
1. Aesthetic direction (one phrase: editorial Mediterranean / brutalist-elegant / Japanese minimal / art-deco geometric / playful-folk / etc.). Vary across runs.
2. Type pair: distinctive display + clean body. Never Inter, Arial, Roboto, Space Grotesk.
3. Palette: dominant + sharp accent. Never purple-on-white.
4. Section flow: hero → 3-5 brand sections → visit/contact.
5. Pull verbatim review quotes for testimonials.

## OUTPUT
- One HTML doc starting with \`<!doctype html>\`. No commentary, no fences.
- All CSS in a single \`<style>\`. All JS inline at end of body.
- External: Google Fonts only.

## BILINGUAL EN/EL
- Every visible string in \`<span class="lang-en">…</span><span class="lang-el">…</span>\`.
- Top-right pill toggle EN | EL. Default EN. Persist via localStorage.
- \`body[data-lang="en"] .lang-el {display:none}\` and vice versa.
- Greek must be natural, idiomatic. Use «» punctuation.

## SECTIONS
- Hero first. Visit/Contact last. 4-6 total.
- Invent section names from the dossier — never "About", "Menu", "Gallery", "Rooms".
- Each main section: 2-3 paragraphs + 1 verbatim review pull quote (attributed by first name).

## COPY
- Ground every claim in the dossier. Never invent prices, dishes, founders, awards.
- Forbidden: "nestled", "discover", "come experience", "welcome to", "authentic flavours", "warm hospitality", "embark on", "step into", "oasis of", "hidden gem", "perfect blend", "unforgettable experience".
- Prefer concrete specifics ("30 steps to the water") over generalities.

## PHONES & CTAS
- Mobile → wrap in BOTH \`tel:+<number>\` AND \`wa.me/<number>?text=<url-encoded greeting>\`.
- Landline → only if present.
- Directions URL: \`https://www.google.com/maps/search/?api=1&query=<urlencoded name>&query_place_id=<place_id>\`. Fall back to name+address if no place_id.
- Floating WhatsApp button: bottom-right, 60px green (#25D366), tooltip "Chat with <host>". <520px viewport: 54px, no tooltip.

## IMAGES
- Use provided photo_urls with \`loading="lazy"\` and \`object-fit:cover\`.
- Never hotlink airbnb.com / booking.com / tripadvisor.com (403s).
- No photo_urls? Inline SVG placeholders with palette-matched gradients and "REPLACE · LABEL" text.

## PRICES
- Omit. Pricing happens via WhatsApp / phone / OTA listings.

## OWNER EDIT
- After \`<meta theme-color>\` insert:
  \`<!-- OWNER EDIT NOTES — Bilingual site. Every visible string appears twice in lang-en/lang-el spans. Edit BOTH. Look for EDIT: markers. Prices omitted — pricing via WhatsApp / phone / OTA. -->\`
- Add inline \`<!-- EDIT: LABEL -->\` markers above editable images, phone, WhatsApp button, first paragraph of each section. Never nest comments.

## META & FOOTER
- \`<title>\`: "<Brand> · <Location>" specific.
- \`<meta description>\`: under 160 chars, specific. No clichés.
- \`<meta theme-color>\`: dominant palette color.
- Footer: brand italic serif, nav links, "© <year> <brand> · <location>", "Photos © the owners".

Produce the complete bilingual HTML now.`;

export const DESIGNER_SYSTEM_FULL = SITEPILOT_PROMPT_LEAN;
export const DESIGNER_SYSTEM_RULES_ONLY = SITEPILOT_PROMPT_LEAN;

// Back-compat alias for any callsite that used the old constant name.
export const DESIGNER_SYSTEM = DESIGNER_SYSTEM_FULL;

export interface DesignerBusiness {
  name: string;
  place_id?: string;
  formatted_address?: string;
  address: string;
  sector?: string;
  phones: { mobiles: string[]; landlines: string[]; display: string[] };
  opening_hours?: string[];
  google_maps_uri?: string;
  editorial_summary?: string;
  photo_urls?: string[];
  reviews?: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }>;
  rating?: number;
  user_ratings_total?: number;
}

export function buildDesignerUserPrompt(args: { dossier: Dossier; business: DesignerBusiness }): string {
  const { dossier, business: b } = args;
  const reviewsBlock = (b.reviews ?? [])
    .slice(0, 8)
    .map((r) => `- ${r.author ?? "Guest"} (${r.rating ?? "?"}★ · ${r.relative_time ?? ""}): ${(r.text ?? "").trim()}`)
    .join("\n");
  const photos = (b.photo_urls ?? []).length
    ? (b.photo_urls as string[]).map((u, i) => `${i + 1}. ${u}`).join("\n")
    : "(none — use labelled SVG placeholders)";
  return `BRAND DOSSIER (from research phase — ground your copy in this, do not invent):

\`\`\`json
${JSON.stringify(dossier, null, 2)}
\`\`\`

BUSINESS BASICS:
- Name: ${b.name}
- Place ID: ${b.place_id ?? "(unknown)"}
- Address: ${b.formatted_address || b.address}
- Sector: ${b.sector ?? "(unknown)"}
- Mobile: ${b.phones.mobiles.join(", ") || "(none)"}
- Landline: ${b.phones.landlines.join(", ") || "(none)"}
- Google Maps: ${b.google_maps_uri ?? "(none)"}
- Hours: ${(b.opening_hours ?? []).join(" | ") || "(unknown)"}
- Google editorial summary: ${b.editorial_summary ?? "(none)"}
- Rating: ${b.rating ?? "n/a"} (${b.user_ratings_total ?? 0} reviews)

REAL PHOTO URLS (use these as <img src> with loading="lazy" + object-fit:cover):
${photos}

REVIEWS (use verbatim as pull quotes — attribute by first name):
${reviewsBlock || "(none)"}

Produce the complete bilingual HTML now.`;
}
