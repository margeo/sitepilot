// Brand research phase: Gemini + Google Search grounding produces a
// rich dossier that downstream design phases consume. Shared so both
// research-business.ts (standalone call) and generate-site-background.ts
// (pipeline step) use the same prompt + parser.

import type { Dossier } from "./dossier";
import { callGemini, hasGemini } from "./gemini";

export { hasGemini };

export interface ResearchBusiness {
  name: string;
  address?: string;
  formatted_address?: string;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  website_uri?: string;
  editorial_summary?: string;
  sector?: string;
  reviews?: Array<{ author?: string; rating?: number; text?: string }>;
}

const SYSTEM_PROMPT = `You are a brand researcher. Given a business's basic Google Places data,
research its public web presence (Instagram, Facebook, Tripadvisor, Booking.com, Airbnb, blogs,
travel guides) to produce a rich brand dossier.

Ground everything in what you actually find. Never invent specific facts (prices, dishes,
awards, host names) that you cannot verify through your searches. If a field cannot be grounded,
return null or an empty array for it.

Your final message MUST end with a single fenced JSON block (\`\`\`json ... \`\`\`) containing
the dossier — nothing after the closing fence.`;

function buildUserPrompt(b: ResearchBusiness): string {
  const addr = b.formatted_address || b.address || "";
  const reviewLines = (b.reviews ?? [])
    .slice(0, 5)
    .map((r) => `- ${r.author ?? "Reviewer"} (${r.rating ?? "?"}): ${(r.text ?? "").slice(0, 300)}`)
    .join("\n");

  return `Business:
Name: ${b.name}
Address: ${addr}
Sector: ${b.sector ?? "unknown"}
Google rating: ${b.rating ?? "n/a"} (${b.user_ratings_total ?? 0} reviews)
Has existing website: ${b.website_uri ? `yes (${b.website_uri})` : "no"}
Editorial summary (from Google): ${b.editorial_summary ?? "(none)"}
Top reviews:
${reviewLines || "(none)"}

Research this business on the web. Look for:
- Instagram / Facebook / Tripadvisor / Booking.com / Airbnb presence (exact handles / URLs)
- Signature offerings (dishes, rooms, services), founder/host names, story
- What customers consistently praise (the vibe)
- Target audience (families, couples, digital nomads, luxury, budget, etc.)
- Unique facts that would make a website memorable

Produce the dossier as a JSON object with this exact shape (use null / [] when ungrounded):
{
  "name": "string",
  "category_descriptor": "short, specific phrase like 'Family-run seafront studios' or 'Traditional village taverna'",
  "address": "string",
  "location_notes": "1-2 sentences about the setting/neighborhood, or null",
  "season": "summer | winter | year_round | null",
  "social": {
    "instagram": "@handle or url, or null",
    "facebook": "url or null",
    "tripadvisor": "url or null",
    "airbnb": "url or null",
    "booking": "url or null",
    "website": "url or null"
  },
  "brand_identity": {
    "vibe": "3-6 descriptors joined by '·' (e.g. 'family-run · authentic · slow-travel premium')",
    "keywords": ["5-10 evocative words"],
    "target_audience": "1 sentence",
    "unique_story": "2-3 sentences of real narrative grounded in research"
  },
  "signature_elements": ["3-6 concrete standout features — be specific"],
  "review_highlights": [
    { "quote": "short verbatim customer quote", "theme": "what it demonstrates (e.g. 'hosts warmth')" }
  ],
  "confidence": 0.0
}

Confidence: 0.9+ if grounded in multiple sources, 0.6-0.8 if limited sources, <0.5 if mostly speculative.
Return the JSON inside a single \`\`\`json fenced block.`;
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const obj = text.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

export async function researchBusiness(business: ResearchBusiness): Promise<{ dossier: Dossier; model: string }> {
  const result = await callGemini({
    systemInstruction: SYSTEM_PROMPT,
    prompt: buildUserPrompt(business),
    enableSearch: true,
    temperature: 0.4,
    maxOutputTokens: 2400,
  });

  const jsonStr = extractJson(result.text);
  if (!jsonStr) throw new Error(`Research: Gemini returned no JSON. Raw: ${result.text.slice(0, 400)}`);

  let dossier: Dossier;
  try {
    dossier = JSON.parse(jsonStr) as Dossier;
  } catch (parseErr) {
    throw new Error(
      `Research: failed to parse dossier JSON: ${parseErr instanceof Error ? parseErr.message : parseErr}`,
    );
  }

  if (!dossier.sources?.length && result.groundingSources.length > 0) {
    dossier.sources = result.groundingSources
      .filter((s) => s.uri)
      .map((s) => ({ title: s.title, uri: s.uri }));
  }

  return { dossier, model: result.model };
}
