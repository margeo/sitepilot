// TEMPORARY test endpoint. Fires 6 variant phrasings of "hotels in <location>"
// against Google Places (paginated to 3 pages each) and reports per-variant
// uniqueAdded so we can see whether rephrasing actually pulls new places out
// of Google's ranker. Delete when done experimenting.
//
// Usage: GET /.netlify/functions/search-test?location=Symi%2C%20Greece

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
  address: string;
}

async function placesTextSearch(
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,nextPageToken",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn(`[search-test] ${res.status} on "${textQuery}" p${page + 1}: ${t.slice(0, 200)}`);
      return all;
    }
    const data = (await res.json()) as {
      places?: Array<{ id: string; displayName?: { text?: string }; formattedAddress?: string }>;
      nextPageToken?: string;
    };
    for (const p of data.places ?? []) {
      all.push({
        place_id: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
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

  const variants = [
    `hotels in ${location}`,
    `hotels ${location}`,
    `${location} hotels`,
    `best hotels in ${location}`,
    `small hotels in ${location}`,
    `hotels near ${location}`,
  ];

  const t0 = Date.now();
  const batches = await Promise.all(variants.map((v) => placesTextSearch(apiKey, v, 3)));
  const elapsedMs = Date.now() - t0;

  const seen = new Set<string>();
  const perQuery = variants.map((q, i) => {
    const batch = batches[i];
    const newOnes = batch.filter((b) => !seen.has(b.place_id));
    for (const b of newOnes) seen.add(b.place_id);
    return {
      query: q,
      returned: batch.length,
      uniqueAdded: newOnes.length,
      newNames: newOnes.map((b) => b.name),
      allNames: batch.map((b) => b.name),
    };
  });

  return jsonRes(200, {
    location,
    variants: variants.length,
    totalCalls: batches.reduce((sum, b) => sum + Math.ceil(b.length / 20 || 1), 0),
    totalUnique: seen.size,
    totalReturned: batches.reduce((s, b) => s + b.length, 0),
    elapsedMs,
    perQuery,
  });
};
