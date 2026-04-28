// TEMPORARY test endpoint. Fires the proposed 16-query structure
// (Tier A umbrella + Tier B distinct + Tier C niche), each paginated to 3
// pages, then filters to no-website places only. Reports per-query
// uniqueAdded so we can see whether the proposed prune holds up on a new
// location like Paros.
//
// Usage: GET /.netlify/functions/search-test?location=Paros%2C%20Greece

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  reviewCount: number;
  hasWebsite: boolean;
}

const TIER_A = ["lodging", "hotels"];
const TIER_B = [
  "boutique hotels",
  "villas",
  "condos",
  "bungalows",
  "guesthouses",
  "apartments for rent",
  "studios",
  "bed and breakfasts",
];
const TIER_C = [
  "traditional stone houses",
  "seaside apartments",
  "houseboats",
  "cabins",
  "hostels",
  "inns",
];

async function placesPaginated(
  apiKey: string,
  textQuery: string,
  maxPages = 3,
): Promise<Place[]> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const body: Record<string, unknown> = { textQuery, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,nextPageToken",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn(`[search-test] ${res.status} on "${textQuery}" p${page + 1}: ${t.slice(0, 200)}`);
      return all;
    }
    const data = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        rating?: number;
        userRatingCount?: number;
        websiteUri?: string;
      }>;
      nextPageToken?: string;
    };
    for (const p of data.places ?? []) {
      all.push({
        place_id: p.id,
        name: p.displayName?.text ?? "",
        rating: p.rating,
        reviewCount: p.userRatingCount ?? 0,
        hasWebsite: Boolean(p.websiteUri),
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    if (page < maxPages - 1) await new Promise((r) => setTimeout(r, 2000));
  }
  return all;
}

function jsonRes(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body, null, 2),
  };
}

export const handler: Handler = async (event) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return jsonRes(500, { error: "GOOGLE_MAPS_API_KEY not set" });

  const location = event.queryStringParameters?.location?.trim();
  if (!location) return jsonRes(400, { error: "Pass ?location=..." });

  const queries = [
    ...TIER_A.map((q) => ({ tier: "A", query: `${q} in ${location}` })),
    ...TIER_B.map((q) => ({ tier: "B", query: `${q} in ${location}` })),
    ...TIER_C.map((q) => ({ tier: "C", query: `${q} in ${location}` })),
  ];

  const t0 = Date.now();
  const batches = await Promise.all(queries.map((q) => placesPaginated(apiKey, q.query, 3)));
  const elapsedMs = Date.now() - t0;

  // Pre-filter: drop places that already have a website
  const noWebsiteBatches = batches.map((b) => b.filter((p) => !p.hasWebsite));

  const seen = new Set<string>();
  const perQuery = queries.map((q, i) => {
    const fullBatch = batches[i];
    const filtered = noWebsiteBatches[i];
    const newOnes = filtered.filter((b) => !seen.has(b.place_id));
    for (const b of newOnes) seen.add(b.place_id);
    return {
      tier: q.tier,
      query: q.query,
      paginatedCalls: Math.max(1, Math.ceil(fullBatch.length / 20)),
      returned: fullBatch.length,
      noWebsite: filtered.length,
      uniqueAdded: newOnes.length,
      newNames: newOnes.map((b) => b.name),
    };
  });

  const totalCalls = batches.reduce((s, b) => s + Math.max(1, Math.ceil(b.length / 20)), 0);

  return jsonRes(200, {
    location,
    queriesFired: queries.length,
    totalCalls,
    totalUnique: seen.size,
    elapsedMs,
    perQuery,
  });
};
