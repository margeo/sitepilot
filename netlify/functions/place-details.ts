import type { Handler } from "@netlify/functions";
import { DEMO_DATA } from "./_shared/demo";
import { classifyPhones } from "./_shared/phones";
import { sectorFromGoogleTypes, type Sector } from "./_shared/sectors";

interface Body {
  place_id: string;
  basic?: {
    name?: string;
    address?: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    has_website?: boolean;
  };
  sector_hint?: Sector;
}

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function computeLeadScore(b: {
  has_website: boolean; rating?: number; user_ratings_total?: number;
  phones: { mobiles: string[] }; name: string; editorial_summary?: string;
}, sector: Sector) {
  let score = 5;
  const reasons: string[] = [];
  if (!b.has_website) { score += 3; reasons.push("+3 no website"); }
  else { score -= 2; reasons.push("-2 already has a website"); }
  if ((b.rating ?? 0) >= 4.5) { score += 2; reasons.push("+2 excellent rating (≥4.5)"); }
  else if ((b.rating ?? 0) >= 4.0) { score += 1; reasons.push("+1 good rating (≥4.0)"); }
  const rc = b.user_ratings_total ?? 0;
  if (rc >= 300) { score += 2; reasons.push("+2 high review volume (≥300)"); }
  else if (rc >= 100) { score += 1; reasons.push("+1 solid review volume (≥100)"); }
  else if (rc < 15) { score -= 1; reasons.push("-1 very low review count (<15)"); }
  if (b.phones.mobiles.length > 0) { score += 1; reasons.push("+1 mobile number (WhatsApp-ready)"); }
  const premium: Sector[] = ["villa", "hotel", "boutique", "boat_rental"];
  if (premium.includes(sector)) { score += 1; reasons.push(`+1 premium sector (${sector})`); }
  if (/villa|suite|resort|boutique|luxury|premium/i.test(`${b.name} ${b.editorial_summary ?? ""}`)) {
    score += 1; reasons.push("+1 premium brand cues");
  }
  score = Math.max(1, Math.min(10, score));
  return { score, reasons };
}

async function placeDetails(place_id: string, apiKey: string) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "id", "displayName", "formattedAddress", "rating", "userRatingCount",
        "types", "primaryType", "primaryTypeDisplayName", "websiteUri",
        "businessStatus", "regularOpeningHours", "currentOpeningHours",
        "internationalPhoneNumber", "nationalPhoneNumber", "googleMapsUri",
        "editorialSummary", "reviews", "photos",
      ].join(","),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Places details failed (${res.status}): ${t}`);
  }
  return (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    primaryType?: string;
    primaryTypeDisplayName?: { text?: string };
    websiteUri?: string;
    businessStatus?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    currentOpeningHours?: { weekdayDescriptions?: string[] };
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    googleMapsUri?: string;
    editorialSummary?: { text?: string };
    reviews?: Array<{
      authorAttribution?: { displayName?: string };
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
    }>;
    photos?: Array<{ name?: string }>;
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON body" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const { place_id, basic, sector_hint } = body;
  if (!place_id) return jsonRes(400, { error: "place_id required" });

  if (!apiKey) {
    // find in demo
    for (const list of Object.values(DEMO_DATA)) {
      const d = list.find((x) => x.place_id === place_id);
      if (d) {
        const phones = classifyPhones(d.phone_numbers);
        const sector = d.sector_hint;
        const lead = computeLeadScore({
          has_website: d.has_website,
          rating: d.rating,
          user_ratings_total: d.user_ratings_total,
          phones,
          name: d.name,
          editorial_summary: d.editorial_summary,
        }, sector);
        return jsonRes(200, {
          business: {
            place_id: d.place_id, name: d.name, address: d.formatted_address,
            formatted_address: d.formatted_address,
            rating: d.rating, user_ratings_total: d.user_ratings_total,
            types: d.types, has_website: d.has_website,
            phones, opening_hours: d.opening_hours,
            google_maps_uri: `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(d.place_id)}`,
            photo_refs: d.photo_refs, reviews: d.reviews,
            editorial_summary: d.editorial_summary,
            lead_score: lead.score, lead_score_reasons: lead.reasons,
            sector,
          },
          demo: true,
        });
      }
    }
    return jsonRes(404, { error: "Demo business not found" });
  }

  try {
    const p = await placeDetails(place_id, apiKey);
    const raws = [p.internationalPhoneNumber, p.nationalPhoneNumber].filter(Boolean) as string[];
    const phones = classifyPhones(raws);
    const hasWebsite = Boolean(p.websiteUri || basic?.has_website);
    const types = p.types ?? basic?.types ?? [];
    const sector = sectorFromGoogleTypes(types, sector_hint);
    const reviews = (p.reviews ?? []).slice(0, 5).map((r) => ({
      author: r.authorAttribution?.displayName,
      rating: r.rating,
      text: r.text?.text,
      relative_time: r.relativePublishTimeDescription,
    }));
    const photo_refs = (p.photos ?? []).map((ph) => ph.name ?? "").filter(Boolean);
    const editorial = p.editorialSummary?.text;
    const lead = computeLeadScore({
      has_website: hasWebsite, rating: p.rating, user_ratings_total: p.userRatingCount,
      phones, name: p.displayName?.text ?? basic?.name ?? "", editorial_summary: editorial,
    }, sector);
    return jsonRes(200, {
      business: {
        place_id: p.id ?? place_id,
        name: p.displayName?.text ?? basic?.name ?? "",
        address: p.formattedAddress ?? basic?.address ?? "",
        formatted_address: p.formattedAddress,
        rating: p.rating, user_ratings_total: p.userRatingCount,
        types, has_website: hasWebsite, website_uri: p.websiteUri,
        phones,
        opening_hours: p.currentOpeningHours?.weekdayDescriptions
          ?? p.regularOpeningHours?.weekdayDescriptions
          ?? [],
        google_maps_uri: p.googleMapsUri,
        photo_refs, reviews,
        primary_type: p.primaryType,
        primary_type_display: p.primaryTypeDisplayName?.text,
        editorial_summary: editorial,
        lead_score: lead.score, lead_score_reasons: lead.reasons,
        sector,
      },
      demo: false,
    });
  } catch (err) {
    return jsonRes(500, { error: err instanceof Error ? err.message : String(err) });
  }
};
