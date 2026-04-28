// TEMPORARY test endpoint. Runs the proposed 21-query structure against a
// location, applying the SAME filters as the live app (search-businesses.ts):
//   - type whitelist (lodging types only)
//   - location-token filter (address must contain a location token)
//   - no-website
//   - rating >= minRating (default 4)
//   - reviewCount >= minReviews (default 10)
//   - business not CLOSED_PERMANENTLY
// Reports both the funnel counts and the final list — apples-to-apples with
// what the app deep-search shows the user.
//
// Usage: GET /.netlify/functions/search-test?location=Mykonos%2C%20Greece
//        Optional: &minRating=4&minReviews=10

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount: number;
  types: string[];
  hasWebsite: boolean;
  businessStatus?: string;
}

// 21 proposed queries (current 25 minus villas, vacation rentals,
// holiday rentals, holiday homes; plus lodging up front).
const QUERIES = [
  // Tier A — umbrella
  "lodging",
  "hotels",
  // Tier B — hotel-tier
  "boutique hotels",
  "resorts",
  "motels",
  "inns",
  "hostels",
  "extended stay hotels",
  "aparthotels",
  // Tier C — rentals + apartments
  "apartments for rent",
  "condos",
  "studios",
  "serviced apartments",
  "seaside apartments",
  "bed and breakfasts",
  "guesthouses",
  // Tier D — specialty
  "farmstays",
  "cottages",
  "cabins",
  "bungalows",
  "houseboats",
];

// Same lodging-type whitelist as cfg.includedTypes.accommodations in
// search-businesses.ts.
const LODGING_TYPE_WHITELIST = new Set([
  "hotel",
  "resort_hotel",
  "motel",
  "inn",
  "bed_and_breakfast",
  "cottage",
  "extended_stay_hotel",
  "farmstay",
  "guest_house",
  "hostel",
  "lodging",
  "private_guest_room",
]);

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
  const minRating = Number(event.queryStringParameters?.minRating ?? 4);
  const minReviews = Number(event.queryStringParameters?.minReviews ?? 10);

  const queries = QUERIES.map((q) => `${q} in ${location}`);

  const t0 = Date.now();
  const batches = await Promise.all(queries.map((q) => placesPaginated(apiKey, q, 3)));
  const elapsedMs = Date.now() - t0;

  // Dedupe by place_id (keep first occurrence — earlier query gets credit)
  const byId = new Map<string, Place>();
  for (const list of batches) for (const p of list) if (!byId.has(p.place_id)) byId.set(p.place_id, p);
  let raw = Array.from(byId.values());
  const totalRaw = raw.length;

  // Type whitelist (any-of)
  raw = raw.filter((r) => r.types.some((t) => LODGING_TYPE_WHITELIST.has(t)));
  const afterTypeWhitelist = raw.length;

  // Location-token filter (same as deep mode)
  const locTokens = location
    .toLowerCase()
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  if (locTokens.length > 0) {
    raw = raw.filter((r) => {
      const addr = (r.address || "").toLowerCase();
      return locTokens.some((t) => addr.includes(t));
    });
  }
  const afterLocationFilter = raw.length;

  // Final filters: no-website + rating + reviews + not closed
  const final = raw.filter(
    (r) =>
      !r.hasWebsite &&
      (r.rating ?? 0) >= minRating &&
      r.reviewCount >= minReviews &&
      r.businessStatus !== "CLOSED_PERMANENTLY",
  );

  // Per-query unique-added (against the deduped raw set, no filters yet)
  const seen = new Set<string>();
  const perQuery = queries.map((q, i) => {
    const batch = batches[i];
    const newOnes = batch.filter((b) => !seen.has(b.place_id));
    for (const b of newOnes) seen.add(b.place_id);
    return {
      query: q,
      paginatedCalls: Math.max(1, Math.ceil(batch.length / 20)),
      returned: batch.length,
      uniqueAdded: newOnes.length,
    };
  });

  const totalCalls = batches.reduce((s, b) => s + Math.max(1, Math.ceil(b.length / 20)), 0);

  return jsonRes(200, {
    location,
    minRating,
    minReviews,
    queriesFired: queries.length,
    totalCalls,
    elapsedMs,
    funnel: {
      totalRaw,
      afterTypeWhitelist,
      afterLocationFilter,
      finalShown: final.length,
    },
    finalList: final.map((p) => ({
      name: p.name,
      address: p.address,
      rating: p.rating,
      reviewCount: p.reviewCount,
    })),
    perQuery,
  });
};
