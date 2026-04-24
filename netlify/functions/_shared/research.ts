// Brand research phase: produces a grounded dossier from the business's
// public web presence. Default path = Gemini + google_search tool (direct
// API). When `researchModelId` is supplied, we route to the matching
// provider-direct API so web-search capability is preserved.

import Anthropic from "@anthropic-ai/sdk";
import type { Dossier } from "./dossier";
import { callGemini, hasGemini } from "./gemini";

export { hasGemini };

// Map a dropdown modelId ("provider:model") to the provider-direct call
// needed for research. OpenRouter can't pass Gemini's `google_search` or
// Anthropic's `web_search_20260209` tools through its generic chat API,
// so OpenRouter options reroute to the corresponding direct provider.
function resolveResearchRoute(modelId: string): {
  provider: "gemini" | "anthropic";
  directModel: string;
} {
  const colon = modelId.indexOf(":");
  const provider = modelId.slice(0, colon);
  const model = modelId.slice(colon + 1);

  if (provider === "anthropic") {
    // anthropic:claude-opus-4-7 — already direct.
    return { provider: "anthropic", directModel: model };
  }
  if (provider === "openrouter") {
    if (model.startsWith("google/")) {
      // openrouter:google/gemini-3.1-flash-lite-preview
      // → direct Gemini model: gemini-3.1-flash-lite-preview
      return { provider: "gemini", directModel: model.replace(/^google\//, "") };
    }
    if (model.startsWith("anthropic/")) {
      // openrouter:anthropic/claude-opus-4.7
      // → direct Anthropic model: claude-opus-4-7 (dot -> dash)
      const direct = model.replace(/^anthropic\//, "").replace(/\./g, "-");
      return { provider: "anthropic", directModel: direct };
    }
  }
  // Fallback: use Gemini 2.5 Flash direct (stable research baseline).
  return { provider: "gemini", directModel: "gemini-2.5-flash" };
}

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

async function researchViaGemini(
  business: ResearchBusiness,
  model: string,
): Promise<{ dossier: Dossier; model: string }> {
  const result = await callGemini({
    model,
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

async function researchViaAnthropic(
  business: ResearchBusiness,
  model: string,
): Promise<{ dossier: Dossier; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set — required for Claude research path");
  const client = new Anthropic({ apiKey: key });

  // Claude's web_search tool lets the model issue live web queries during
  // the turn. Results come back in citation-annotated content blocks.
  const body = {
    model,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    messages: [{ role: "user", content: [{ type: "text", text: buildUserPrompt(business) }] }],
  } as unknown as Parameters<typeof client.messages.create>[0];

  const msg = (await client.messages.create(body)) as {
    content: Array<{ type: string; text?: string; citations?: Array<{ url?: string; title?: string }> }>;
  };

  // Concatenate text blocks, collect citations as grounding sources.
  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
  const citations: Array<{ title?: string; uri?: string }> = [];
  for (const c of msg.content) {
    for (const cit of c.citations ?? []) {
      if (cit.url) citations.push({ title: cit.title, uri: cit.url });
    }
  }

  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error(`Research: Claude returned no JSON. Raw: ${text.slice(0, 400)}`);

  let dossier: Dossier;
  try {
    dossier = JSON.parse(jsonStr) as Dossier;
  } catch (parseErr) {
    throw new Error(
      `Research: failed to parse dossier JSON: ${parseErr instanceof Error ? parseErr.message : parseErr}`,
    );
  }
  if (!dossier.sources?.length && citations.length > 0) {
    dossier.sources = citations;
  }
  return { dossier, model };
}

export async function researchBusiness(
  business: ResearchBusiness,
  researchModelId?: string,
): Promise<{ dossier: Dossier; model: string }> {
  // Default to Gemini 2.5 Flash direct (the stable baseline).
  if (!researchModelId) {
    return researchViaGemini(business, "gemini-2.5-flash");
  }
  const route = resolveResearchRoute(researchModelId);
  if (route.provider === "gemini") {
    return researchViaGemini(business, route.directModel);
  }
  return researchViaAnthropic(business, route.directModel);
}
