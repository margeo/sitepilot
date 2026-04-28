// Brand research phase: produces a grounded dossier from the business's
// public web presence. Three paths, all of which preserve web-search:
//
//   openrouter:google/<model>     → OpenRouter with :online suffix (Exa web search)
//   openrouter:anthropic/<model>  → OpenRouter with :online suffix (Exa web search)
//   anthropic:<model>             → Anthropic direct with web_search_20250305 tool
//
// Default (no researchModelId passed) uses Gemini 2.5 Flash direct + google_search.

import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
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

// Try to parse JSON with three layers of tolerance:
// 1. Plain JSON.parse (works when the model output clean JSON)
// 2. Manual cleanup: trailing commas + raw newlines/tabs inside strings
// 3. jsonrepair library: handles unescaped inner quotes, missing commas,
//    truncated output, comments, single-quoted strings, and other common
//    LLM JSON glitches that step 2 doesn't catch.
function parseTolerantJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Layer 2: manual cleanup
    try {
      let s = raw.trim();
      s = s.replace(/,(\s*[}\]])/g, "$1");
      let out = "";
      let inStr = false;
      let escaped = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escaped) {
          out += ch;
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          out += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          out += ch;
          continue;
        }
        if (inStr && (ch === "\n" || ch === "\r" || ch === "\t")) {
          out += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
          continue;
        }
        out += ch;
      }
      return JSON.parse(out) as T;
    } catch {
      // Layer 3: jsonrepair — most tolerant fallback
      const repaired = jsonrepair(raw);
      return JSON.parse(repaired) as T;
    }
  }
}

// ---- Gemini direct (default path) ---------------------------------------

async function researchViaGeminiDirect(
  business: ResearchBusiness,
  model: string,
): Promise<{ dossier: Dossier; model: string; usage?: { input_tokens?: number; output_tokens?: number } }> {
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
  const dossier = parseTolerantJson<Dossier>(jsonStr);

  if (!dossier.sources?.length && result.groundingSources.length > 0) {
    dossier.sources = result.groundingSources
      .filter((s) => s.uri)
      .map((s) => ({ title: s.title, uri: s.uri }));
  }
  return { dossier, model: result.model, usage: result.usage };
}

// ---- OpenRouter with :online suffix (OpenRouter's Exa-backed web search) -

async function researchViaOpenRouter(
  business: ResearchBusiness,
  openrouterSlug: string, // e.g. "google/gemini-3.1-flash-lite-preview"
): Promise<{ dossier: Dossier; model: string; usage?: { input_tokens?: number; output_tokens?: number } }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  const model = `${openrouterSlug}:online`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://sitepilot-app.netlify.app",
      "X-Title": "SitePilot",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(business) },
      ],
      max_tokens: 2400,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Research (OpenRouter :online) ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        annotations?: Array<{ type?: string; url_citation?: { url?: string; title?: string } }>;
      };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Research (OpenRouter :online) returned empty content");
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error(`Research (OpenRouter :online): no JSON. Raw: ${text.slice(0, 400)}`);
  const dossier = parseTolerantJson<Dossier>(jsonStr);

  // OpenRouter returns URL citations via the `annotations` array on the
  // message. Collect them as dossier.sources when the model didn't fill it in.
  if (!dossier.sources?.length) {
    const ann = data.choices?.[0]?.message?.annotations ?? [];
    const sources = ann
      .filter((a) => a.type === "url_citation" && a.url_citation?.url)
      .map((a) => ({ title: a.url_citation?.title, uri: a.url_citation?.url }));
    if (sources.length) dossier.sources = sources;
  }
  return {
    dossier,
    model,
    usage: { input_tokens: data.usage?.prompt_tokens, output_tokens: data.usage?.completion_tokens },
  };
}

// ---- Anthropic direct with web_search tool -------------------------------

async function researchViaAnthropic(
  business: ResearchBusiness,
  model: string,
): Promise<{ dossier: Dossier; model: string; usage?: { input_tokens?: number; output_tokens?: number } }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set — required for Claude research path");
  const client = new Anthropic({ apiKey: key });

  const body = {
    model,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    messages: [{ role: "user", content: [{ type: "text", text: buildUserPrompt(business) }] }],
  } as unknown as Parameters<typeof client.messages.create>[0];

  const msg = (await client.messages.create(body)) as {
    content: Array<{ type: string; text?: string; citations?: Array<{ url?: string; title?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

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
  if (!jsonStr) throw new Error(`Research (Anthropic): no JSON. Raw: ${text.slice(0, 400)}`);
  const dossier = parseTolerantJson<Dossier>(jsonStr);
  if (!dossier.sources?.length && citations.length > 0) dossier.sources = citations;
  return {
    dossier,
    model,
    usage: { input_tokens: msg.usage?.input_tokens, output_tokens: msg.usage?.output_tokens },
  };
}

// ---- Public entrypoint ---------------------------------------------------

export async function researchBusiness(
  business: ResearchBusiness,
  researchModelId?: string,
): Promise<{ dossier: Dossier; model: string; usage?: { input_tokens?: number; output_tokens?: number } }> {
  if (!researchModelId) {
    return researchViaGeminiDirect(business, "gemini-2.5-flash");
  }

  const colon = researchModelId.indexOf(":");
  const provider = researchModelId.slice(0, colon);
  const model = researchModelId.slice(colon + 1);

  if (provider === "openrouter") {
    return researchViaOpenRouter(business, model);
  }
  if (provider === "anthropic") {
    return researchViaAnthropic(business, model);
  }
  // Unknown prefix — fall back to Gemini direct baseline.
  return researchViaGeminiDirect(business, "gemini-2.5-flash");
}
