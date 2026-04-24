import type { Handler } from "@netlify/functions";
import { buildTemplateSite, type TemplateBusiness } from "./_shared/template";
import { SECTOR_THEMES, type Sector } from "./_shared/sectors";
import { callLLM, hasLLM } from "./_shared/llm";

interface Body {
  business: {
    place_id?: string;
    name: string;
    address: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    phones: { mobiles: string[]; landlines: string[]; display: string[] };
    opening_hours?: string[];
    google_maps_uri?: string;
    photo_refs?: string[];
    reviews?: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }>;
    editorial_summary?: string;
    sector?: Sector;
    lead_score?: number;
  };
}

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function photoUrl(ref: string, maxwidth = 1200) {
  return `/.netlify/functions/photos?reference=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  let body: Body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  const b = body.business;
  if (!b?.name) return jsonRes(400, { error: "business.name required" });

  const sector: Sector = b.sector ?? "local_services";
  const theme = SECTOR_THEMES[sector];

  const photo_urls = (b.photo_refs ?? []).slice(0, 8).map((r) => photoUrl(r, 1200));

  const templateBusiness: TemplateBusiness = {
    name: b.name,
    sector,
    address: b.address,
    formatted_address: b.formatted_address,
    place_id: b.place_id,
    google_maps_uri: b.google_maps_uri,
    phones: b.phones,
    opening_hours: b.opening_hours,
    rating: b.rating,
    user_ratings_total: b.user_ratings_total,
    reviews: b.reviews ?? [],
    editorial_summary: b.editorial_summary,
    photo_urls,
  };

  const seo_keywords = [
    ...theme.keywords,
    b.name.toLowerCase(),
    ...((b.formatted_address || b.address).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 2)),
  ];
  const suggested_pages = theme.suggestedPages;

  // No LLM configured: fall back to static template.
  if (!hasLLM()) {
    const html = buildTemplateSite(templateBusiness);
    return jsonRes(200, {
      site: { html, seo_keywords, suggested_pages, generated_by: "template" },
      demo: false,
    });
  }

  try {
    const reviewSummaries = (b.reviews ?? [])
      .slice(0, 5)
      .map((r) => `- ${r.author ?? "Reviewer"} (${r.rating ?? "?"}): ${(r.text ?? "").slice(0, 200)}`)
      .join("\n");

    const systemPrompt = [
      "You are a senior copywriter and UX strategist creating a website proposal for a local business.",
      "Produce SHORT, natural, conversion-focused copy that feels specific to THIS business, not generic.",
      "Draw on the reviews and editorial summary to capture the business's actual vibe.",
      "Never invent specific facts (prices, dishes, awards) that are not in the supplied data.",
      "Return strictly valid JSON — no prose outside the JSON object.",
    ].join(" ");

    const userPrompt = `Business data:
Name: ${b.name}
Sector: ${sector} (${theme.label})
Address: ${b.formatted_address || b.address}
Rating: ${b.rating ?? "n/a"} (${b.user_ratings_total ?? 0} reviews)
Editorial summary: ${b.editorial_summary ?? "n/a"}
Top reviews:
${reviewSummaries || "(none)"}

Produce JSON with these exact keys:
{
  "tagline": "12-18 word hero subtitle that captures the vibe",
  "about_text": "90-150 word About paragraph. Friendly, specific to the business. No made-up facts.",
  "seo_keywords": ["array of 6-10 keywords"],
  "additional_tagline_short": "6-word punchy version for meta description"
}`;

    const { text: raw, provider, model } = await callLLM({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 900,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`LLM (${provider} ${model}) returned no JSON object`);
    const parsed = JSON.parse(jsonMatch[0]) as {
      tagline?: string;
      about_text?: string;
      seo_keywords?: string[];
      additional_tagline_short?: string;
    };

    let html = buildTemplateSite({
      ...templateBusiness,
      editorial_summary: parsed.about_text || templateBusiness.editorial_summary,
    });
    if (parsed.tagline) {
      html = html.replace(
        /<p class="tagline">[\s\S]*?<\/p>/,
        `<p class="tagline">${parsed.tagline.replace(/</g, "&lt;")}</p>`,
      );
    }

    return jsonRes(200, {
      site: {
        html,
        seo_keywords: parsed.seo_keywords?.length ? parsed.seo_keywords : seo_keywords,
        suggested_pages,
        generated_by: provider === "openrouter" ? "openrouter" : "claude",
      },
      demo: false,
    });
  } catch (err) {
    // Graceful fallback: template site + note about the failure.
    const html = buildTemplateSite(templateBusiness);
    return jsonRes(200, {
      site: {
        html,
        seo_keywords,
        suggested_pages,
        generated_by: "template",
      },
      demo: false,
      note: `LLM generation failed, used template. Reason: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
};
