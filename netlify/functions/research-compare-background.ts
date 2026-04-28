// Background function (v2 handler). Runs all 9 research-model paths in
// parallel on a single business. Writes the side-by-side comparison into
// Netlify Blobs ("compares" store) keyed by jobId. Polled via
// research-compare-status.ts. Filename ends in -background.ts so Netlify
// gives it the 15-minute execution budget.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { researchBusiness, type ResearchBusiness } from "./_shared/research";

interface JobInput {
  jobId: string;
  business: ResearchBusiness;
}

const MODEL_IDS: Array<{ id: string | undefined; label: string }> = [
  { id: undefined, label: "Gemini 2.5 Flash · default (Gemini direct + google_search)" },
  { id: "openrouter:google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite · OpenRouter :online" },
  { id: "openrouter:google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro · OpenRouter :online" },
  { id: "openrouter:anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 · OpenRouter :online" },
  { id: "openrouter:anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 · OpenRouter :online" },
  { id: "openrouter:anthropic/claude-opus-4.7", label: "Claude Opus 4.7 · OpenRouter :online" },
  { id: "anthropic:claude-haiku-4-5", label: "Claude Haiku 4.5 · Anthropic direct + web_search" },
  { id: "anthropic:claude-sonnet-4-6", label: "Claude Sonnet 4.6 · Anthropic direct + web_search" },
  { id: "anthropic:claude-opus-4-7", label: "Claude Opus 4.7 · Anthropic direct + web_search" },
];

interface ResultRow {
  modelId: string | undefined;
  label: string;
  ok: boolean;
  model?: string;
  dossier?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  elapsedMs: number;
  error?: string;
  sourcesCount?: number;
  signatureCount?: number;
  reviewHighlightsCount?: number;
  confidence?: number;
}

async function writeJob(jobId: string, record: unknown) {
  const store = getStore("compares");
  await store.setJSON(jobId, record);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  let input: JobInput;
  try {
    input = (await req.json()) as JobInput;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!input.jobId || !input.business?.name) {
    return new Response("Missing jobId or business.name", { status: 400 });
  }

  const t0 = Date.now();
  await writeJob(input.jobId, {
    status: "running",
    createdAt: t0,
    updatedAt: t0,
    businessName: input.business.name,
  });

  const settled = await Promise.allSettled(
    MODEL_IDS.map(async ({ id, label }): Promise<ResultRow> => {
      const ts = Date.now();
      try {
        const { dossier, model, usage } = await researchBusiness(input.business, id);
        const d = dossier as {
          sources?: unknown[];
          signature_elements?: unknown[];
          review_highlights?: unknown[];
          confidence?: number;
        };
        return {
          modelId: id,
          label,
          ok: true,
          model,
          dossier,
          usage,
          elapsedMs: Date.now() - ts,
          sourcesCount: d.sources?.length ?? 0,
          signatureCount: d.signature_elements?.length ?? 0,
          reviewHighlightsCount: d.review_highlights?.length ?? 0,
          confidence: d.confidence,
        };
      } catch (err) {
        return {
          modelId: id,
          label,
          ok: false,
          elapsedMs: Date.now() - ts,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const results: ResultRow[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          modelId: MODEL_IDS[i].id,
          label: MODEL_IDS[i].label,
          ok: false,
          elapsedMs: 0,
          error: String(s.reason),
        },
  );

  await writeJob(input.jobId, {
    status: "done",
    createdAt: t0,
    updatedAt: Date.now(),
    elapsedMs: Date.now() - t0,
    businessName: input.business.name,
    results,
  });

  return new Response("done", { status: 202 });
};

export const config: Config = {
  path: "/.netlify/functions/research-compare-background",
};
