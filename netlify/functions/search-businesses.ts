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
  restaurant: {
    quickQueries: ["restaurants"],
    deepQueries: [
      "restaurants",
      "tavernas",
      "bistros",
      "eateries",
      "fine dining",
      "family restaurants",
    ],
    includedTypes: ["restaurant"],
  },
  tavern: {
    quickQueries: ["Greek tavernas"],
    deepQueries: [
      "Greek tavernas",
      "traditional tavernas",
      "meze restaurants",
      "ouzeri",
      "village tavernas",
      "family-run tavernas",
    ],
    includedTypes: ["greek_restaurant"],
  },
  beach_bar: {
    quickQueries: ["beach bars"],
    deepQueries: [
      "beach bars",
      "seaside bars",
      "beachfront cafes",
      "sunset bars",
      "beach restaurants",
      "beach clubs",
    ],
    includedTypes: ["bar"],
  },
  villa: {
    quickQueries: ["guest houses cottages apartments"],
    deepQueries: [
      "villas",
      "apartments for rent",
      "holiday rentals",
      "studios",
      "traditional stone houses",
      "bed and breakfasts",
      "guesthouses",
      "seaside apartments",
      "family-run accommodations",
    ],
    includedTypes: ["guest_house", "cottage", "bed_and_breakfast", "private_guest_room", "lodging", "inn"],
  },
  hotel: {
    quickQueries: ["hotels"],
    deepQueries: [
      "hotels",
      "boutique hotels",
      "resorts",
      "small hotels",
      "design hotels",
      "luxury hotels",
    ],
    includedTypes: ["hotel", "resort_hotel", "motel", "inn"],
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

    if (searchDepth === "deep") {
      // Deep: multiple phrasings, no type filter, paginate up to 3 pages each. Broad discovery.
      const queries = cfg.deepQueries.map((q) => `${q} in ${location}`);
      const batches = await Promise.all(
        queries.map((q) => placesTextSearch({ apiKey, textQuery: q, maxPages: 3 })),
      );
      const byId = new Map<string, Basic>();
      for (const list of batches) for (const b of list) byId.set(b.place_id, b);
      raw = Array.from(byId.values());
    } else {
      // Quick: single focused phrase, per-type strict filtering, 1 page. Fast.
      const quickQuery = `${cfg.quickQueries[0]} in ${location}`;
      const batches = await Promise.all(
        cfg.includedTypes.map((t) =>
          placesTextSearch({
            apiKey,
            textQuery: quickQuery,
            includedType: t,
            strictTypeFiltering: true,
            maxPages: 1,
          }),
        ),
      );
      const byId = new Map<string, Basic>();
      for (const list of batches) for (const b of list) byId.set(b.place_id, b);
      raw = Array.from(byId.values());
    }

    const totalFound = raw.length;
    let results = raw;
    if (noWebsiteOnly) results = results.filter((r) => !r.has_website);
    results = results
      .filter((r) => (r.rating ?? 0) >= minRating)
      .filter((r) => (r.user_ratings_total ?? 0) >= minReviews)
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, maxResults);

    return jsonRes(200, { businesses: results, demo: false, totalFound, searchDepth });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
