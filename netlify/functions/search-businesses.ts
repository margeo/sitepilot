import type { Handler } from "@netlify/functions";
import { DEMO_DATA } from "./_shared/demo";
import type { Sector } from "./_shared/sectors";

interface Body {
  sector: Sector;
  location: string;
  noWebsiteOnly?: boolean;
  minRating?: number;
  minReviews?: number;
  maxResults?: number;
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

interface SectorConfig {
  queries: string[]; // many phrasings — paginated 3 pages each, no per-call type filter
  includedTypes: string[]; // post-filter type whitelist (any-of)
}

// One unified search mode: multiple phrasings, paginated to 3 pages each (60
// raw per phrasing), then post-filtered by type whitelist + location tokens.
// Replaces the old quick/deep split.
const SECTOR_CONFIG: Record<Sector, SectorConfig> = {
  restaurants_tavernas: {
    queries: [
      "restaurants",
      "tavernas",
      "Greek tavernas",
      "traditional tavernas",
      "meze restaurants",
      "ouzeri",
      "bistros",
      "eateries",
      "fine dining",
      "family restaurants",
      "fast food",
      "pizzerias",
      "gyros and souvlaki",
      "brunch spots",
    ],
    includedTypes: [
      "restaurant",
      "greek_restaurant",
      "seafood_restaurant",
      "italian_restaurant",
      "pizza_restaurant",
      "fast_food_restaurant",
      "breakfast_restaurant",
      "brunch_restaurant",
      "sandwich_shop",
    ],
  },
  bakeries: {
    queries: [
      "bakeries",
      "patisseries",
      "bread shops",
      "pastry shops",
      "Greek bakeries",
      "traditional bakeries",
      "artisan bakeries",
      "cake shops",
    ],
    includedTypes: ["bakery"],
  },
  cafes_bars_pubs: {
    queries: [
      "cafes",
      "coffee shops",
      "espresso bars",
      "brunch cafes",
      "bars",
      "cocktail bars",
      "wine bars",
      "pubs",
      "gastropubs",
      "beach bars",
      "seaside bars",
      "sunset bars",
      "beach clubs",
    ],
    includedTypes: ["cafe", "coffee_shop", "bar", "pub", "wine_bar"],
  },
  // 20-query structure validated empirically across Symi / Athens / Paros /
  // Mykonos. Drops queries that proved globally dead at Google's searchText
  // endpoint (vacation rentals, holiday rentals, holiday homes, villas) and
  // queries that proved noisy or near-zero-value (resorts, traditional stone
  // houses). Adds `lodging` as the broadest umbrella term — strong recall
  // anchor that complements `hotels`.
  accommodations: {
    queries: [
      // Tier A — umbrella
      "lodging",
      "hotels",
      // Tier B — hotel-tier
      "boutique hotels",
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
    ],
    includedTypes: [
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
    ],
  },
  boutique: {
    queries: [
      "boutiques",
      "fashion stores",
      "clothing stores",
      "jewelry shops",
      "concept stores",
      "designer stores",
    ],
    includedTypes: ["clothing_store"],
  },
  car_rental: {
    queries: ["car rentals", "car hire", "rent a car", "scooter rentals", "vehicle rentals"],
    includedTypes: ["car_rental"],
  },
  boat_rental: {
    queries: [
      "boat rentals",
      "boat tours",
      "yacht charters",
      "sailing trips",
      "fishing trips",
      "sea taxi",
      "watersports",
    ],
    includedTypes: ["tour_agency"],
  },
  beauty_wellness: {
    queries: [
      "beauty salons",
      "spas",
      "hair salons",
      "massage",
      "nail salons",
      "wellness centers",
      "yoga studios",
    ],
    includedTypes: ["beauty_salon", "spa", "hair_salon", "nail_salon"],
  },
  local_services: {
    queries: ["local services", "workshops", "repair shops", "small shops", "artisans", "pottery"],
    includedTypes: ["store"],
  },
};

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface PlacesError {
  query: string;
  page: number;
  status: number;
  message: string;
}

// Single call (or paginated chain) to Places Text Search.
// maxPages caps the pagination; Google requires a short wait between page fetches
// for the nextPageToken to become valid, and stops issuing tokens after page 3.
// Returns the actual number of HTTP calls made (= pages fetched, including failed ones)
// so the frontend can compute Places API cost.
async function placesTextSearch(args: {
  apiKey: string;
  textQuery: string;
  maxPages?: number;
  errors?: PlacesError[];
}): Promise<{ results: Basic[]; apiCalls: number }> {
  const { apiKey, textQuery, maxPages = 3, errors } = args;
  const all: Basic[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;

  for (let page = 0; page < maxPages; page++) {
    const reqBody: Record<string, unknown> = { textQuery, pageSize: 20 };
    if (pageToken) reqBody.pageToken = pageToken;

    apiCalls++;
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.businessStatus,nextPageToken",
      },
      body: JSON.stringify(reqBody),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const message = body.slice(0, 300) || res.statusText;
      console.warn(`[places] ${res.status} on "${textQuery}" page ${page + 1}: ${message}`);
      errors?.push({ query: textQuery, page: page + 1, status: res.status, message });
      return { results: all, apiCalls };
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
        user_ratings_total: p.userRatingCount,
        types: p.types,
        business_status: p.businessStatus,
        has_website: Boolean(p.websiteUri),
        website_uri: p.websiteUri,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // Google requires ~2s before the next page token is valid.
    if (page < maxPages - 1) await new Promise((r) => setTimeout(r, 2000));
  }

  return { results: all, apiCalls };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON body" });
  }
  const {
    sector,
    location,
    noWebsiteOnly = true,
    minRating = 0,
    minReviews = 0,
    maxResults = 20,
  } = body;
  if (!sector || !location) {
    return jsonRes(400, { error: "sector and location are required" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const demo = (DEMO_DATA[sector] ?? []).slice(0, maxResults);
    return jsonRes(200, {
      businesses: demo.map((d) => ({
        place_id: d.place_id,
        name: d.name,
        address: d.formatted_address,
        rating: d.rating,
        user_ratings_total: d.user_ratings_total,
        types: d.types,
        has_website: d.has_website,
      })),
      demo: true,
      note: "No GOOGLE_MAPS_API_KEY set — showing demo data. Add the env var in Netlify to search real businesses.",
    });
  }

  try {
    const cfg = SECTOR_CONFIG[sector];
    const debug: Record<string, unknown> = {};
    const errors: PlacesError[] = [];

    // Fire all phrasings in parallel, paginated to 3 pages each (max 60 per phrasing).
    const queries = cfg.queries.map((q) => `${q} in ${location}`);
    const batches = await Promise.all(
      queries.map((q) => placesTextSearch({ apiKey, textQuery: q, maxPages: 3, errors })),
    );

    // Dedupe by place_id, keep first occurrence (= earliest query gets credit).
    const byId = new Map<string, Basic>();
    for (const { results: list } of batches)
      for (const b of list) if (!byId.has(b.place_id)) byId.set(b.place_id, b);
    let raw = Array.from(byId.values());

    // Per-query "uniqueAdded" trace for F12 debug.
    const seen = new Set<string>();
    let totalApiCalls = 0;
    debug.perQuery = queries.map((q, i) => {
      const batch = batches[i];
      totalApiCalls += batch.apiCalls;
      const newOnes = batch.results.filter((b) => !seen.has(b.place_id));
      for (const b of newOnes) seen.add(b.place_id);
      return {
        query: q,
        returned: batch.results.length,
        apiCalls: batch.apiCalls,
        uniqueAdded: newOnes.length,
        newNames: newOnes.map((b) => b.name),
      };
    });
    debug.totalApiCalls = totalApiCalls;
    debug.queryCount = queries.length;
    debug.totalRaw = raw.length;

    // Post-filter 1: type whitelist (any-of). Drops "Hotel X" restaurant
    // and similar miscategorized results that text-match but aren't lodging.
    const whitelist = new Set(cfg.includedTypes);
    raw = raw.filter((r) => (r.types ?? []).some((t) => whitelist.has(t)));
    debug.afterTypeWhitelist = raw.length;

    // Post-filter 2: location tokens. Drops places matched by the country
    // word only (e.g. "Symi" hotel-search returns Limnos result whose only
    // shared token is "Greece"). Loose enough to keep neighborhood-named
    // addresses ("Ornos 846 00, Greece" passes via "greece").
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
    debug.afterLocationFilter = raw.length;

    const totalFound = raw.length;
    let results = raw;
    if (noWebsiteOnly) results = results.filter((r) => !r.has_website);
    results = results
      .filter((r) => (r.rating ?? 0) >= minRating)
      .filter((r) => (r.user_ratings_total ?? 0) >= minReviews)
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, maxResults);
    debug.afterFinalFilters = results.length;
    debug.errorCount = errors.length;
    debug.errors = errors;

    return jsonRes(200, { businesses: results, demo: false, totalFound, _debug: debug });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
