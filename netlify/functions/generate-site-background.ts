// Background function: runs the slow research + free-form-design pipeline
// and writes the final site into Netlify Blobs. Triggered fire-and-forget
// by generate-site.ts; polled by generate-status.ts.

import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { researchBusiness, hasGemini, type ResearchBusiness } from "./_shared/research";
import { designSiteFreeForm } from "./_shared/free-form-designer";
import type { DesignerBusiness } from "./_shared/designer-prompt";

interface JobInput {
  jobId: string;
  modelId: string;
  researchModelId?: string;
  business: DesignerBusiness & ResearchBusiness & {
    lead_score?: number;
    photo_refs?: string[];
  };
}

interface JobRecord {
  status: "pending" | "researching" | "designing" | "done" | "error";
  createdAt: number;
  updatedAt: number;
  modelId: string;
  researchModelId?: string;
  businessName: string;
  site?: {
    html: string;
    provider: string;
    model: string;
    seo_keywords: string[];
    generated_by: string;
  };
  dossier?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  elapsedMs?: { research?: number; design?: number; total?: number };
  error?: string;
}

function photoUrl(ref: string, maxwidth = 1600) {
  return `/.netlify/functions/photos?reference=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
}

async function writeJob(jobId: string, record: JobRecord) {
  const store = getStore("sites");
  await store.setJSON(jobId, record);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };
  let input: JobInput;
  try {
    input = JSON.parse(event.body || "{}") as JobInput;
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }
  const { jobId, modelId, researchModelId, business } = input;
  if (!jobId || !modelId || !business?.name) {
    return { statusCode: 400, body: "Missing jobId, modelId, or business.name" };
  }

  const t0 = Date.now();
  const base: JobRecord = {
    status: "researching",
    createdAt: t0,
    updatedAt: t0,
    modelId,
    researchModelId,
    businessName: business.name,
  };
  await writeJob(jobId, base);

  try {
    // Research phase needs either Gemini (default/gemini-routed options) or
    // Anthropic (claude-routed options). Gate on whichever one the resolved
    // route will need; for safety, at least require GEMINI_API_KEY since the
    // default path uses it.
    if (!hasGemini() && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY set — research cannot run");
    }

    // Phase 1: research
    const researchStart = Date.now();
    const { dossier } = await researchBusiness(business, researchModelId);
    const researchMs = Date.now() - researchStart;

    await writeJob(jobId, {
      ...base,
      status: "designing",
      updatedAt: Date.now(),
      dossier,
      elapsedMs: { research: researchMs },
    });

    // Phase 2: free-form design
    const photoUrls = (business.photo_refs ?? []).slice(0, 10).map((r) => photoUrl(r, 1600));
    const designerBusiness: DesignerBusiness = {
      name: business.name,
      place_id: business.place_id,
      formatted_address: business.formatted_address,
      address: business.address ?? business.formatted_address ?? "",
      sector: business.sector,
      phones: business.phones ?? { mobiles: [], landlines: [], display: [] },
      opening_hours: business.opening_hours,
      google_maps_uri: business.google_maps_uri,
      editorial_summary: business.editorial_summary,
      photo_urls: photoUrls,
      reviews: business.reviews,
      rating: business.rating,
      user_ratings_total: business.user_ratings_total,
    };

    const design = await designSiteFreeForm({ dossier, business: designerBusiness, modelId });

    const final: JobRecord = {
      ...base,
      status: "done",
      updatedAt: Date.now(),
      dossier,
      usage: design.usage,
      elapsedMs: {
        research: researchMs,
        design: design.elapsedMs,
        total: Date.now() - t0,
      },
      site: {
        html: design.html,
        provider: design.provider,
        model: design.model,
        seo_keywords: dossier.brand_identity?.keywords?.length
          ? dossier.brand_identity.keywords
          : [business.name.toLowerCase()],
        generated_by: `v3_${design.provider}`,
      },
    };
    await writeJob(jobId, final);
    return { statusCode: 202, body: "done" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await writeJob(jobId, {
      ...base,
      status: "error",
      updatedAt: Date.now(),
      elapsedMs: { total: Date.now() - t0 },
      error: msg,
    });
    return { statusCode: 202, body: "error" };
  }
};
