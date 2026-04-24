import type { Handler } from "@netlify/functions";
import { buildTemplateSite, type TemplateBusiness } from "./_shared/template";
import { SECTOR_THEMES, type Sector } from "./_shared/sectors";
import { callLLM, hasLLM } from "./_shared/llm";
import { hasGemini, callGemini } from "./_shared/gemini";
import { designSite } from "./_shared/design-director";
import { buildModularSite, type SiteData } from "./_shared/modular-template";
import type { Dossier } from "./_shared/dossier";

interface Body {
  business: {
    place_id?: string;
    name: string;
    address: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    phones: { mobiles: string[]; landlines: string[]; display: string[] };
    opening_hours?: string[];
    google_maps_uri?: string;
    photo_refs?: string[];
    reviews?: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }>;
    editorial_summary?: string;
    sector?: Sector;
    lead_score?: number;
    website_uri?: string;
    types?: string[];
  };
  mode?: "v1" | "v2"; // default "v2" when all keys are available
}

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function photoUrl(ref: string, maxwidth = 1200) {
  return `/.netlify/functions/photos?reference=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
}

// --- Research phase (uses Gemini with Google Search grounding) ---
const RESEARCH_SYSTEM = `You are a brand researcher. Given a business's basic Google Places data,
research its public web presence (Instagram, Facebook, Tripadvisor, Booking.com, Airbnb, blogs,
travel guides) and produce a JSON brand dossier.
Ground everything in what you actually find. Never invent specifics.
Your final message MUST end with a single fenced JSON block (\`\`\`json ... \`\`\`).`;

function buildResearchPrompt(b: Body["business"]): string {
  const addr = b.formatted_address || b.address || "";
  const reviews = (b.reviews ?? [])
    .slice(0, 5)
    .map((r) => `- ${r.author ?? "R"} (${r.rating ?? "?"}): ${(r.text ?? "").slice(0, 250)}`)
    .join("\n");
  return `Business:
Name: ${b.name}
Address: ${addr}
Sector: ${b.sector ?? "unknown"}
Google rating: ${b.rating ?? "n/a"} (${b.user_ratings_total ?? 0} reviews)
Existing site: ${b.website_uri ?? "none"}
Editorial: ${b.editorial_summary ?? "(none)"}
Top reviews:
${reviews || "(none)"}

Search the web for this business (Instagram, Facebook, Tripadvisor, Airbnb, Booking, travel blogs).
Produce a dossier JSON:
{
  "name": "string",
  "category_descriptor": "short phrase",
  "address": "string",
  "location_notes": "1-2 sentences or null",
  "season": "summer|winter|year_round|null",
  "social": {"instagram":null,"facebook":null,"tripadvisor":null,"airbnb":null,"booking":null,"website":null},
  "brand_identity": {"vibe":"","keywords":[],"target_audience":"","unique_story":""},
  "signature_elements": [],
  "review_highlights": [{"quote":"","theme":""}],
  "confidence": 0.0
}
Return inside a \`\`\`json fenced block.`;
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const obj = text.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

async function researchBusiness(b: Body["business"]): Promise<Dossier> {
  const result = await callGemini({
    systemInstruction: RESEARCH_SYSTEM,
    prompt: buildResearchPrompt(b),
    enableSearch: true,
    temperature: 0.4,
    maxOutputTokens: 2400,
  });
  const jsonStr = extractJson(result.text);
  if (!jsonStr) throw new Error(`Research: no JSON. Raw: ${result.text.slice(0, 300)}`);
  const dossier = JSON.parse(jsonStr) as Dossier;
  if (!dossier.sources?.length && result.groundingSources.length) {
    dossier.sources = result.groundingSources
      .filter((s) => s.uri)
      .map((s) => ({ title: s.title, uri: s.uri }));
  }
  return dossier;
}

// --- Assembly helpers ---
function buildSiteData(b: Body["business"]): SiteData {
  const photo_urls = (b.photo_refs ?? []).slice(0, 10).map((r) => photoUrl(r, 1600));
  return {
    place_id: b.place_id,
    google_maps_uri: b.google_maps_uri,
    address: b.formatted_address || b.address,
    phones: b.phones,
    opening_hours: b.opening_hours,
    photo_urls,
    reviews: b.reviews ?? [],
  };
}

// --- v1 legacy path: single LLM call → swap copy into fixed template ---
async function generateV1(b: Body["business"], sector: Sector, templateBusiness: TemplateBusiness, seo_keywords: string[], suggested_pages: string[]) {
  const theme = SECTOR_THEMES[sector];
  const reviews = (b.reviews ?? [])
    .slice(0, 5)
    .map((r) => `- ${r.author ?? "R"} (${r.rating ?? "?"}): ${(r.text ?? "").slice(0, 200)}`)
    .join("\n");
  const systemPrompt = [
    "You are a senior copywriter creating website copy for a local business.",
    "Produce SHORT, natural copy specific to THIS business — draw on the reviews.",
    "Never invent facts. Return strictly valid JSON.",
  ].join(" ");
  const userPrompt = `Business:
Name: ${b.name}
Sector: ${sector} (${theme.label})
Rating: ${b.rating ?? "n/a"} (${b.user_ratings_total ?? 0} reviews)
Reviews:
${reviews || "(none)"}

Return JSON: { "tagline": "...", "about_text": "...", "seo_keywords": [...] }`;
  const { text, provider } = await callLLM({ system: systemPrompt, user: userPrompt, maxTokens: 900 });
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("v1: no JSON");
  const parsed = JSON.parse(jsonStr) as { tagline?: string; about_text?: string; seo_keywords?: string[] };
  let html = buildTemplateSite({
    ...templateBusiness,
    editorial_summary: parsed.about_text || templateBusiness.editorial_summary,
  });
  if (parsed.tagline) {
    html = html.replace(
      /<p class="tagline">[\s\S]*?<\/p>/,
      `<p class="tagline">${parsed.tagline.replace(/</g, "&lt;")}</p>`,
    );
  }
  return {
    html,
    seo_keywords: parsed.seo_keywords?.length ? parsed.seo_keywords : seo_keywords,
    suggested_pages,
    generated_by: provider === "openrouter" ? "openrouter_v1" : "claude_v1",
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  const b = body.business;
  if (!b?.name) return jsonRes(400, { error: "business.name required" });

  const sector: Sector = b.sector ?? "local_services";
  const theme = SECTOR_THEMES[sector];
  const photo_urls = (b.photo_refs ?? []).slice(0, 8).map((r) => photoUrl(r, 1200));
  const templateBusiness: TemplateBusiness = {
    name: b.name,
    sector,
    address: b.address,
    formatted_address: b.formatted_address,
    place_id: b.place_id,
    google_maps_uri: b.google_maps_uri,
    phones: b.phones,
    opening_hours: b.opening_hours,
    rating: b.rating,
    user_ratings_total: b.user_ratings_total,
    reviews: b.reviews ?? [],
    editorial_summary: b.editorial_summary,
    photo_urls,
  };
  const seo_keywords = [
    ...theme.keywords,
    b.name.toLowerCase(),
    ...((b.formatted_address || b.address).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 2)),
  ];
  const suggested_pages = theme.suggestedPages;

  const mode: "v1" | "v2" = body.mode ?? (hasGemini() && hasLLM() ? "v2" : "v1");

  // Mode V2: full research → design → assemble pipeline
  if (mode === "v2" && hasGemini() && hasLLM()) {
    try {
      const dossier = await researchBusiness(b);
      const { spec, provider, model } = await designSite({ dossier, sector });
      const html = buildModularSite({ dossier, spec, data: buildSiteData(b) });
      return jsonRes(200, {
        site: {
          html,
          seo_keywords: dossier.brand_identity.keywords?.length
            ? dossier.brand_identity.keywords
            : seo_keywords,
          suggested_pages,
          generated_by: `v2_${provider}`,
        },
        demo: false,
        dossier,
        design: { palette: spec.palette_id, sections: spec.sections.map((s) => s.type), model },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Fall through to v1
      if (hasLLM()) {
        try {
          const v1 = await generateV1(b, sector, templateBusiness, seo_keywords, suggested_pages);
          return jsonRes(200, {
            site: v1,
            demo: false,
            note: `v2 pipeline failed, used v1. Reason: ${reason}`,
          });
        } catch {}
      }
      const html = buildTemplateSite(templateBusiness);
      return jsonRes(200, {
        site: { html, seo_keywords, suggested_pages, generated_by: "template" },
        demo: false,
        note: `v2 and v1 failed, used template. Reason: ${reason}`,
      });
    }
  }

  // Mode V1: single-shot copy swap
  if (hasLLM()) {
    try {
      const v1 = await generateV1(b, sector, templateBusiness, seo_keywords, suggested_pages);
      return jsonRes(200, { site: v1, demo: false });
    } catch (err) {
      const html = buildTemplateSite(templateBusiness);
      return jsonRes(200, {
        site: { html, seo_keywords, suggested_pages, generated_by: "template" },
        demo: false,
        note: `v1 failed, used template. Reason: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  // No keys: template only
  const html = buildTemplateSite(templateBusiness);
  return jsonRes(200, {
    site: { html, seo_keywords, suggested_pages, generated_by: "template" },
    demo: false,
  });
};
