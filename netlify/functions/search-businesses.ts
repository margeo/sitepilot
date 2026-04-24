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
  textQuery: string;
  includedTypes: string[];
}

// textQuery = human-readable search phrase (Google uses it as semantic context).
// includedTypes = list of Google primary place types (Table A). We run one
// request per type in parallel with strictTypeFiltering, then merge + dedupe.
const SECTOR_CONFIG: Record<Sector, SectorConfig> = {
  restaurant: {
    textQuery: "restaurants",
    includedTypes: ["restaurant"],
  },
  tavern: {
    textQuery: "Greek tavernas",
    includedTypes: ["greek_restaurant"],
  },
  beach_bar: {
    textQuery: "beach bars",
    includedTypes: ["bar"],
  },
  villa: {
    textQuery: "guest houses cottages apartments",
    includedTypes: ["guest_house", "cottage", "bed_and_breakfast", "private_guest_room", "lodging", "inn"],
  },
  hotel: {
    textQuery: "hotels",
    includedTypes: ["hotel", "resort_hotel", "motel", "inn"],
  },
  boutique: {
    textQuery: "boutiques",
    includedTypes: ["clothing_store"],
  },
  car_rental: {
    textQuery: "car rentals",
    includedTypes: ["car_rental"],
  },
  boat_rental: {
    textQuery: "boat tours and rentals",
    includedTypes: ["tour_agency"],
  },
  beauty_wellness: {
    textQuery: "beauty salons and spas",
    includedTypes: ["beauty_salon", "spa", "hair_salon", "nail_salon"],
  },
  local_services: {
    textQuery: "local services",
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

async function placesTextSearch(
  query: string,
  includedType: string,
  apiKey: string,
): Promise<Basic[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: query,
      includedType,
      strictTypeFiltering: true,
      pageSize: 20,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Places text search failed (${res.status}): ${errText}`);
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
  };
  return (data.places ?? []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types,
    business_status: p.businessStatus,
    has_website: Boolean(p.websiteUri),
    website_uri: p.websiteUri,
  }));
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
    const query = `${cfg.textQuery} in ${location}`;
    const perType = await Promise.all(
      cfg.includedTypes.map((t) => placesTextSearch(query, t, apiKey)),
    );
    const byId = new Map<string, Basic>();
    for (const list of perType) {
      for (const b of list) byId.set(b.place_id, b);
    }
    const raw = Array.from(byId.values());
    const totalFound = raw.length;
    let results = raw;
    if (noWebsiteOnly) results = results.filter((r) => !r.has_website);
    results = results
      .filter((r) => (r.rating ?? 0) >= minRating)
      .filter((r) => (r.user_ratings_total ?? 0) >= minReviews)
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, maxResults);
    return jsonRes(200, { businesses: results, demo: false, totalFound });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
