// Manual-input bypass for /search-businesses.
// Takes a list of business names the operator already found on Google Maps
// and resolves each via a single Places Text Search call (pageSize: 1).
//
// Cost: ~$0.032 per name vs. the ~$1+ that a full sector search burns. No
// AI involvement here — pure Google Places lookup, no LLM extraction.

import type { Handler } from "@netlify/functions";

interface Body {
  names: string[];
  locationHint?: string; // e.g. "Paros, Greece" — appended to each query for disambiguation
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

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }

  const cleaned = (body.names ?? [])
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter((n) => n.length > 1)
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
  if (cleaned.length === 0) {
    return jsonRes(400, { error: "names[] is required (one or more business names)" });
  }
  if (cleaned.length > 50) {
    return jsonRes(400, { error: "Max 50 names per request — split into batches if you have more" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return jsonRes(500, { error: "GOOGLE_MAPS_API_KEY not set" });

  const queries = cleaned.map((n) =>
    body.locationHint ? `${n} ${body.locationHint}` : n,
  );
  const resolved = await Promise.all(queries.map((q) => placesTextSearchOne(q, apiKey)));

  const byId = new Map<string, Basic>();
  const missing: string[] = [];
  resolved.forEach((r, i) => {
    if (r) {
      if (!byId.has(r.place_id)) byId.set(r.place_id, r);
    } else {
      missing.push(cleaned[i]);
    }
  });

  return jsonRes(200, {
    businesses: Array.from(byId.values()),
    requested: cleaned,
    missing,
    apiCalls: cleaned.length,
  });
};
