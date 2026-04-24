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

const SECTOR_QUERY: Record<Sector, string> = {
  restaurant: "restaurant",
  tavern: "taverna traditional restaurant",
  beach_bar: "beach bar",
  villa: "villa rental",
  hotel: "hotel",
  boutique: "boutique shop",
  car_rental: "car rental",
  boat_rental: "boat rental yacht charter",
  beauty_wellness: "beauty salon spa",
  local_services: "local services",
};

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function placesTextSearch(query: string, apiKey: string): Promise<Basic[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20 }),
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
    const query = `${SECTOR_QUERY[sector]} in ${location}`;
    let results = await placesTextSearch(query, apiKey);
    if (noWebsiteOnly) results = results.filter((r) => !r.has_website);
    results = results
      .filter((r) => (r.rating ?? 0) >= minRating)
      .filter((r) => (r.user_ratings_total ?? 0) >= minReviews)
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, maxResults);
    return jsonRes(200, { businesses: results, demo: false });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
