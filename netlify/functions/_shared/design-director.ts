// Design director: given a brand dossier, pick a palette and produce a full
// SiteSpec (sections with copy) via LLM. Keeps the prompt focused so the
// model doesn't wander off into inventing facts.

import type { Dossier } from "./dossier";
import type { SiteSpec } from "./site-spec";
import { PALETTES } from "./palettes";
import { callLLM } from "./llm";

const SYSTEM_PROMPT = `You are a senior web designer and copywriter producing a
single-page website specification from a brand dossier.

Rules:
- Pick one palette from the provided palette library whose mood matches the brand.
- Build a section-by-section site: always start with "hero", always end with "contact".
- Write real copy in each section — not template-looking ("Welcome to our restaurant").
  Copy should reference the dossier's signature elements, unique story, or review themes.
- NEVER invent facts (prices, dishes, founder names, awards) that aren't in the dossier.
- For offerings (menu/rooms/services), ONLY list items you can ground in the dossier; if
  you can't ground at least 3 items, omit the offerings section entirely.
- Keep copy natural and specific. No "nestled in", no "discover", no "come experience".
- Output ONLY a single JSON object (fenced \`\`\`json block OK) matching the schema.`;

interface Input {
  dossier: Dossier;
  sector?: string;
}

function buildPaletteTable(): string {
  return Object.values(PALETTES)
    .map((p) => `- "${p.id}" — ${p.description}`)
    .join("\n");
}

function buildUserPrompt({ dossier, sector }: Input): string {
  return `BRAND DOSSIER:
${JSON.stringify(dossier, null, 2)}

SECTOR: ${sector ?? "unknown"}

AVAILABLE PALETTES (pick exactly ONE id):
${buildPaletteTable()}

AVAILABLE SECTION TYPES:
- hero — required, always first. { type: "hero", heading, subhead, cta_primary?, cta_secondary? }
- story — long-form narrative. { type: "story", heading, body, image_side: "left"|"right"|"none" }
- features — grid of signature elements. { type: "features", heading?, intro?, items: [{heading, body}] }
- gallery — photo grid (uses business photos). { type: "gallery", heading?, caption? }
- offerings — structured list. { type: "offerings", kind: "menu"|"rooms"|"services", heading, intro?, items: [{name, description?, meta?}] }
- reviews — quotes from real google reviews (auto-populated). { type: "reviews", heading? }
- contact — required, always last. { type: "contact", heading?, closer? }

SECTOR GUIDANCE:
- restaurants/taverns/bars/cafes: hero → story → features → offerings(menu, only if groundable) → gallery → reviews → contact
- hotels/villas/guesthouses: hero → story → features → offerings(rooms) → gallery → reviews → contact
- beauty_wellness/spa: hero → story → offerings(services) → gallery → reviews → contact
- car_rental/tour_agency: hero → features → offerings(services) → reviews → contact

Produce a SiteSpec JSON:
{
  "palette_id": "<one of the ids above>",
  "sections": [ ... array of sections with full copy ... ]
}`;
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const obj = text.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

export async function designSite(input: Input): Promise<{ spec: SiteSpec; provider: string; model: string }> {
  const { text, provider, model } = await callLLM({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
    maxTokens: 3500,
  });
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error(`Design director: no JSON in output. Raw: ${text.slice(0, 400)}`);
  const parsed = JSON.parse(jsonStr) as SiteSpec;
  if (!parsed.palette_id || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error("Design director returned invalid SiteSpec");
  }
  // Safety: ensure hero first, contact last
  const hero = parsed.sections.find((s) => s.type === "hero");
  const contact = parsed.sections.find((s) => s.type === "contact");
  const middle = parsed.sections.filter((s) => s.type !== "hero" && s.type !== "contact");
  if (hero && contact) {
    parsed.sections = [hero, ...middle, contact];
  }
  return { spec: parsed, provider, model };
}
