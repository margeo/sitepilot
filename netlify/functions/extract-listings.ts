import type { Handler } from "@netlify/functions";
import { callLLM, hasLLM } from "./_shared/llm";

interface Body {
  image: string; // data URL: data:image/png;base64,...
  locationHint?: string; // optional: narrows the subsequent Places lookup
}

interface Basic {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  has_website: boolean;
  website_uri?: string;
}

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function placesTextSearchOne(query: string, apiKey: string): Promise<Basic | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      types?: string[];
      websiteUri?: string;
      businessStatus?: string;
    }>;
  };
  const p = data.places?.[0];
  if (!p) return null;
  return {
    place_id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types,
    business_status: p.businessStatus,
    has_website: Boolean(p.websiteUri),
    website_uri: p.websiteUri,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  if (!hasLLM()) return jsonRes(400, { error: "No LLM provider configured" });

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  if (!body.image?.startsWith("data:image/")) {
    return jsonRes(400, { error: "image must be a data URL (data:image/...;base64,...)" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return jsonRes(500, { error: "GOOGLE_MAPS_API_KEY not set" });

  try {
    const systemPrompt = [
      "You analyze screenshots of Google Maps, business listings, review sites, or search results.",
      "Extract every visible business name. Ignore navigation UI, category tabs, prices, ratings.",
      "Return strictly valid JSON — no prose outside the JSON object.",
    ].join(" ");

    const userPrompt = `Extract all visible business names in this screenshot. For each, also include
any visible address or neighborhood if clearly legible (else null).${
      body.locationHint
        ? `\n\nLocation context (for your understanding, do NOT invent addresses): ${body.locationHint}`
        : ""
    }

Return JSON with this exact shape:
{
  "businesses": [
    { "name": "Business Name", "address_hint": "Address or neighborhood or null" }
  ]
}`;

    const { text: raw } = await callLLM({
      system: systemPrompt,
      user: userPrompt,
      images: [body.image],
      maxTokens: 1200,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("LLM returned no JSON object");
    const parsed = JSON.parse(jsonMatch[0]) as {
      businesses?: Array<{ name?: string; address_hint?: string | null }>;
    };
    const extracted = (parsed.businesses ?? [])
      .map((b) => ({
        name: (b.name ?? "").trim(),
        hint: (b.address_hint ?? "").trim() || undefined,
      }))
      .filter((b) => b.name.length > 1)
      // Dedupe by lowercased name
      .filter((b, i, arr) => arr.findIndex((x) => x.name.toLowerCase() === b.name.toLowerCase()) === i);

    if (extracted.length === 0) {
      return jsonRes(200, { businesses: [], extractedNames: [], note: "No business names detected." });
    }

    // For each extracted name, resolve via Places Text Search (top match).
    const queries = extracted.map((e) => {
      const ctx = e.hint || body.locationHint;
      return ctx ? `${e.name} ${ctx}` : e.name;
    });
    const resolved = await Promise.all(queries.map((q) => placesTextSearchOne(q, apiKey)));
    const byId = new Map<string, Basic>();
    for (const r of resolved) if (r) byId.set(r.place_id, r);

    return jsonRes(200, {
      businesses: Array.from(byId.values()),
      extractedNames: extracted.map((e) => e.name),
      demo: false,
    });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
