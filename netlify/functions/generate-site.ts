import type { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { buildTemplateSite, type TemplateBusiness } from "./_shared/template";
import { SECTOR_THEMES, type Sector } from "./_shared/sectors";

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

  const anthKey = process.env.ANTHROPIC_API_KEY;

  // SEO keywords + suggested pages — always derivable from sector + name
  const seo_keywords = [
    ...theme.keywords,
    b.name.toLowerCase(),
    ...((b.formatted_address || b.address).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 2)),
  ];
  const suggested_pages = theme.suggestedPages;

  // Fallback / no-key path: use the template
  if (!anthKey) {
    const html = buildTemplateSite(templateBusiness);
    return jsonRes(200, {
      site: { html, seo_keywords, suggested_pages, generated_by: "template" },
      demo: false,
    });
  }

  // Claude-enhanced path: ask Claude to produce custom copy, swap into template.
  try {
    const client = new Anthropic({ apiKey: anthKey });
    const reviewSummaries = (b.reviews ?? [])
      .slice(0, 5)
      .map((r) => `- ${r.author ?? "Reviewer"} (${r.rating ?? "?"}): ${(r.text ?? "").slice(0, 200)}`)
      .join("\n");

    const systemPrompt = [
      "You are a senior copywriter and UX strategist creating a website proposal for a local business.",
      "You must produce SHORT, natural, conversion-focused copy.",
      "Never invent specific facts (prices, dishes, awards) that aren't in the supplied data.",
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
  "tagline": "12-18 word hero subtitle",
  "about_text": "90-150 word About paragraph. Friendly, specific to the business. No made-up facts.",
  "seo_keywords": ["array of 6-10 keywords"],
  "additional_tagline_short": "6-word punchy version for meta description"
}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = msg.content.find((c) => c.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no JSON object");
    const parsed = JSON.parse(jsonMatch[0]) as {
      tagline?: string;
      about_text?: string;
      seo_keywords?: string[];
      additional_tagline_short?: string;
    };

    const enriched: TemplateBusiness = {
      ...templateBusiness,
      editorial_summary: parsed.about_text || templateBusiness.editorial_summary,
    };
    // Swap the hero tagline into the template by overriding editorial_summary.
    // The template uses editorial_summary for both hero subtitle and About.
    // We'll inject the tagline directly in the hero via a marker swap:
    let html = buildTemplateSite({
      ...enriched,
      editorial_summary: parsed.about_text,
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
        generated_by: "claude",
      },
      demo: false,
    });
  } catch (err) {
    // Fail gracefully to the template.
    const html = buildTemplateSite(templateBusiness);
    return jsonRes(200, {
      site: {
        html, seo_keywords, suggested_pages, generated_by: "template",
      },
      demo: false,
      note: `Claude generation failed, used template. Reason: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
};
