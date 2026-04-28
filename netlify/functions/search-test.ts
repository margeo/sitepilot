// TEMPORARY test endpoint. Fires "traditional stone houses in <location>"
// alone, paginated 3 pages, returns ALL raw results with name, address,
// types, rating, reviews, hasWebsite — no filtering. Lets us judge whether
// this query is finding real accommodations or noise.
//
// Usage: GET /.netlify/functions/search-test?location=Mykonos%2C%20Greece

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
  address: string;
  types: string[];
  rating?: number;
  reviewCount: number;
  hasWebsite: boolean;
  businessStatus?: string;
}

async function placesPaginated(apiKey: string, textQuery: string, maxPages = 3): Promise<Place[]> {
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
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.businessStatus,nextPageToken",
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
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        types?: string[];
        websiteUri?: string;
        businessStatus?: string;
      }>;
      nextPageToken?: string;
    };
    for (const p of data.places ?? []) {
      all.push({
        place_id: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        rating: p.rating,
        reviewCount: p.userRatingCount ?? 0,
        types: p.types ?? [],
        hasWebsite: Boolean(p.websiteUri),
        businessStatus: p.businessStatus,
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

  const query = `traditional stone houses in ${location}`;
  const t0 = Date.now();
  const all = await placesPaginated(apiKey, query, 3);
  const elapsedMs = Date.now() - t0;

  return jsonRes(200, {
    query,
    location,
    totalReturned: all.length,
    paginatedCalls: Math.max(1, Math.ceil(all.length / 20)),
    elapsedMs,
    results: all.map((p) => ({
      name: p.name,
      address: p.address,
      types: p.types,
      rating: p.rating,
      reviewCount: p.reviewCount,
      hasWebsite: p.hasWebsite,
      businessStatus: p.businessStatus,
    })),
  });
};
