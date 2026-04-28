// Background function (v2 handler). Runs the slow research + free-form-design
// pipeline and writes the final site into Netlify Blobs. Triggered
// fire-and-forget by generate-site.ts; polled by generate-status.ts.
// Filename ends in `-background.ts` so Netlify runs it asynchronously
// with up to a 15-minute execution window.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { researchBusiness, hasGemini, type ResearchBusiness } from "./_shared/research";
import { designSiteFreeForm } from "./_shared/free-form-designer";
import type { DesignerBusiness } from "./_shared/designer-prompt";

interface JobInput {
  jobId: string;
  modelId: string;
  researchModelId?: string;
  // When supplied, the research phase is skipped — this dossier is used
  // directly as the input to design.
  dossier?: unknown;
  business: DesignerBusiness & ResearchBusiness & {
    lead_score?: number;
    photo_refs?: string[];
  };
}

interface PhaseUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface JobRecord {
  status: "pending" | "researching" | "designing" | "done" | "error";
  createdAt: number;
  updatedAt: number;
  modelId: string;
  researchModelId?: string;
  // What the underlying APIs echoed back as the actual served model. These
  // are the proof that the call ran on the model we asked for (vs an OR
  // fallback or a stale identifier). Filled in after each phase succeeds.
  actualResearchModel?: string;
  actualDesignModel?: string;
  businessName: string;
  site?: {
    html: string;
    provider: string;
    model: string;
    seo_keywords: string[];
    generated_by: string;
  };
  dossier?: unknown;
  usage?: { research?: PhaseUsage; design?: PhaseUsage };
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

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  let input: JobInput;
  try {
    input = (await req.json()) as JobInput;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { jobId, modelId, researchModelId, business, dossier: cachedDossier } = input;
  if (!jobId || !modelId || !business?.name) {
    return new Response("Missing jobId, modelId, or business.name", { status: 400 });
  }
  const skipResearch =
    cachedDossier !== undefined && cachedDossier !== null && typeof cachedDossier === "object";

  const t0 = Date.now();
  const base: JobRecord = {
    status: skipResearch ? "designing" : "researching",
    createdAt: t0,
    updatedAt: t0,
    modelId,
    researchModelId,
    businessName: business.name,
  };
  await writeJob(jobId, base);

  try {
    let dossier: ReturnType<typeof JSON.parse>;
    let actualResearchModel: string | undefined;
    let researchUsage: PhaseUsage | undefined;
    let researchMs = 0;

    if (skipResearch) {
      // Frontend passed a dossier from a prior Research click — use as-is,
      // make zero AI calls in this phase.
      dossier = cachedDossier;
    } else {
      if (!hasGemini() && !process.env.ANTHROPIC_API_KEY) {
        throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY set — research cannot run");
      }
      const researchStart = Date.now();
      const r = await researchBusiness(business, researchModelId);
      researchMs = Date.now() - researchStart;
      dossier = r.dossier;
      actualResearchModel = r.model;
      researchUsage = r.usage;

      await writeJob(jobId, {
        ...base,
        status: "designing",
        updatedAt: Date.now(),
        dossier,
        actualResearchModel,
        usage: { research: researchUsage },
        elapsedMs: { research: researchMs },
      });
    }

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
      actualResearchModel,
      actualDesignModel: design.model,
      usage: { research: researchUsage, design: design.usage },
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
    return new Response("done", { status: 202 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await writeJob(jobId, {
      ...base,
      status: "error",
      updatedAt: Date.now(),
      elapsedMs: { total: Date.now() - t0 },
      error: msg,
    });
    return new Response("error", { status: 202 });
  }
};

export const config: Config = {
  path: "/.netlify/functions/generate-site-background",
};
