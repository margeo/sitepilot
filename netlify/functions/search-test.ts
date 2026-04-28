// TEMPORARY test endpoint. Two paginated queries side-by-side:
//   1) "hotels in <location>"        × 3 pages
//   2) "vacation rentals in <location>" × 3 pages
// Reports per-query uniqueAdded + names so we can see whether different
// query keywords pull genuinely different places out of Google's index.
//
// Usage: GET /.netlify/functions/search-test?location=Symi%2C%20Greece

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  reviewCount: number;
}

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
          "places.id,places.displayName,places.rating,places.userRatingCount,nextPageToken",
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
      }>;
      nextPageToken?: string;
    };
    for (const p of data.places ?? []) {
      all.push({
        place_id: p.id,
        name: p.displayName?.text ?? "",
        rating: p.rating,
        reviewCount: p.userRatingCount ?? 0,
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

  const query = `lodging in ${location}`;

  const t0 = Date.now();
  const batch = await placesPaginated(apiKey, query, 3);
  const elapsedMs = Date.now() - t0;

  // Group by review-count buckets so we can see the distribution.
  const byBucket: Record<string, Array<{ name: string; rating?: number; reviewCount: number }>> = {
    "0 reviews": [],
    "1 review": [],
    "2-9 reviews": [],
    "10+ reviews": [],
  };
  for (const p of batch) {
    const meta = { name: p.name, rating: p.rating, reviewCount: p.reviewCount };
    if (p.reviewCount === 0) byBucket["0 reviews"].push(meta);
    else if (p.reviewCount === 1) byBucket["1 review"].push(meta);
    else if (p.reviewCount < 10) byBucket["2-9 reviews"].push(meta);
    else byBucket["10+ reviews"].push(meta);
  }

  return jsonRes(200, {
    query,
    location,
    totalReturned: batch.length,
    paginatedCalls: Math.max(1, Math.ceil(batch.length / 20)),
    elapsedMs,
    byBucket: Object.fromEntries(
      Object.entries(byBucket).map(([k, v]) => [k, { count: v.length, places: v }]),
    ),
  });
};
