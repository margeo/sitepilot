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
  searchDepth?: "quick" | "deep";
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
  quickQueries: string[]; // 1 phrase — used with per-type strict filtering for fast scan
  deepQueries: string[]; // many phrasings — used without type filter for broad discovery
  includedTypes: string[]; // primary Google place types for quick mode
}

// Quick mode: one focused query, strict per-type filtering — returns ~10–20 results fast.
// Deep mode: multiple phrasings, NO includedType filter, paginated to 3 pages each — returns
// 60–200 results in 10–25s. Deep mode is noticeably more expensive (6× more API calls).
const SECTOR_CONFIG: Record<Sector, SectorConfig> = {
  restaurants_tavernas: {
    quickQueries: ["restaurants and tavernas"],
    deepQueries: [
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
      "bakeries",
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
      "bakery",
    ],
  },
  cafes_bars_pubs: {
    quickQueries: ["cafes bars and pubs"],
    deepQueries: [
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
  accommodations: {
    quickQueries: ["hotels villas apartments and vacation rentals"],
    deepQueries: [
      // Traditional hotel side
      "hotels",
      "boutique hotels",
      "resorts",
      "motels",
      "inns",
      "hostels",
      "extended stay hotels",
      "aparthotels",
      // Vacation rental umbrella (Google/Airbnb "private" label — maps to lodging/guest_house types)
      "villas",
      "vacation rentals",
      "holiday rentals",
      "holiday homes",
      "apartments for rent",
      "condos",
      "studios",
      "serviced apartments",
      "traditional stone houses",
      "seaside apartments",
      // B&B / guesthouse side
      "bed and breakfasts",
      "guesthouses",
      "farmstays",
      // Specialty / glamping
      "cabins",
      "cottages",
      "bungalows",
      "houseboats",
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
    quickQueries: ["boutiques"],
    deepQueries: [
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
    quickQueries: ["car rentals"],
    deepQueries: [
      "car rentals",
      "car hire",
      "rent a car",
      "scooter rentals",
      "vehicle rentals",
    ],
    includedTypes: ["car_rental"],
  },
  boat_rental: {
    quickQueries: ["boat tours and rentals"],
    deepQueries: [
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
    quickQueries: ["beauty salons and spas"],
    deepQueries: [
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
    quickQueries: ["local services"],
    deepQueries: [
      "local services",
      "workshops",
      "repair shops",
      "small shops",
      "artisans",
      "pottery",
    ],
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

// Single call (or paginated chain) to Places Text Search.
// If `includedType` is undefined, we search broadly (no type filter, no strict).
// maxPages caps the pagination; Google requires a short wait between page fetches
// for the nextPageToken to become valid.
async function placesTextSearch(args: {
  apiKey: string;
  textQuery: string;
  includedType?: string;
  strictTypeFiltering?: boolean;
  maxPages?: number;
}): Promise<Basic[]> {
  const { apiKey, textQuery, includedType, strictTypeFiltering = false, maxPages = 1 } = args;
  const all: Basic[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const reqBody: Record<string, unknown> = {
      textQuery,
      pageSize: 20,
    };
    if (includedType) {
      reqBody.includedType = includedType;
      reqBody.strictTypeFiltering = strictTypeFiltering;
    }
    if (pageToken) reqBody.pageToken = pageToken;

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
      // Don't fail the whole search if one query errors — just skip this query.
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

  return all;
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
    searchDepth = "quick",
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
      searchDepth,
      note: "No GOOGLE_MAPS_API_KEY set — showing demo data. Add the env var in Netlify to search real businesses.",
    });
  }

  try {
    const cfg = SECTOR_CONFIG[sector];
    let raw: Basic[];
    const debug: Record<string, unknown> = { mode: searchDepth };

    if (searchDepth === "deep") {
      // Deep: multiple phrasings, no type filter, paginate up to 3 pages each. Broad discovery.
      const queries = cfg.deepQueries.map((q) => `${q} in ${location}`);
      const batches = await Promise.all(
        queries.map((q) => placesTextSearch({ apiKey, textQuery: q, maxPages: 3 })),
      );
      const byId = new Map<string, Basic>();
      for (const list of batches) for (const b of list) byId.set(b.place_id, b);
      raw = Array.from(byId.values());
      debug.perQuery = queries.map((q, i) => ({ query: q, returned: batches[i].length }));
      debug.totalRaw = raw.length;
      // Post-filter 1: sector's primary-type whitelist so broad text queries
      // ("hotels in Symi") don't bleed other categories in (a restaurant
      // named "Hotel X", a shop named "Villa Y", etc.).
      const whitelist = new Set(cfg.includedTypes);
      raw = raw.filter((r) => (r.types ?? []).some((t) => whitelist.has(t)));
      debug.afterTypeWhitelist = raw.length;
      // Post-filter 2: geographic — Google's text search is not location-
      // strict and will happily return matching businesses from other
      // countries ("Symi" in Greece can yield results in Mèze, France).
      // Drop any result whose formatted_address doesn't contain at least
      // one meaningful token from the location string.
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
    } else {
      // Quick: single broad phrase, NO type filter, 2 pages (max 40), then
      // post-filter by type whitelist (any-of) + location tokens. Same
      // post-filter logic as deep — just one query instead of 23.
      const quickQuery = `${cfg.quickQueries[0]} in ${location}`;
      raw = await placesTextSearch({ apiKey, textQuery: quickQuery, maxPages: 2 });
      debug.perQuery = [{ query: quickQuery, returned: raw.length }];
      debug.totalRaw = raw.length;
      const whitelist = new Set(cfg.includedTypes);
      raw = raw.filter((r) => (r.types ?? []).some((t) => whitelist.has(t)));
      debug.afterTypeWhitelist = raw.length;
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
    }

    const totalFound = raw.length;
    let results = raw;
    if (noWebsiteOnly) results = results.filter((r) => !r.has_website);
    results = results
      .filter((r) => (r.rating ?? 0) >= minRating)
      .filter((r) => (r.user_ratings_total ?? 0) >= minReviews)
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, maxResults);
    debug.afterFinalFilters = results.length;

    return jsonRes(200, { businesses: results, demo: false, totalFound, searchDepth, _debug: debug });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
