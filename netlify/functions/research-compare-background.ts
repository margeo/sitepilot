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

// Approximate USD pricing (per 1M tokens) + per-call surcharges. Sources:
// OpenRouter / Anthropic / Google AI public pricing pages, late 2026.
// inSearch = surcharge added once per call (Exa or web_search overhead).
interface ModelEntry {
  id: string | undefined;
  label: string;
  inPer1M: number;
  outPer1M: number;
  inSearch: number;
}

// Pricing verified from OpenRouter / Anthropic / Google AI Studio public
// pricing pages (2026-04-28). inPer1M / outPer1M = USD per 1M tokens.
// inSearch = per-call surcharge (Exa for OpenRouter :online ~$0.005,
// web_search for Anthropic direct ~$0.01 per search × ~3 rounds = $0.03).
// Only the 8 models present in the Research Model selector dropdown.
// Default Gemini 2.5 Flash fallback removed — it's not user-selectable.
const MODEL_IDS: ModelEntry[] = [
  // OpenRouter :online (Exa search +$0.005/call)
  { id: "openrouter:google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite · OpenRouter", inPer1M: 0.25, outPer1M: 1.50, inSearch: 0.005 },
  { id: "openrouter:google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro · OpenRouter", inPer1M: 2.00, outPer1M: 12.00, inSearch: 0.005 },
  { id: "openrouter:anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 · OpenRouter", inPer1M: 1.00, outPer1M: 5.00, inSearch: 0.005 },
  { id: "openrouter:anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 · OpenRouter", inPer1M: 3.00, outPer1M: 15.00, inSearch: 0.005 },
  { id: "openrouter:anthropic/claude-opus-4.7", label: "Claude Opus 4.7 · OpenRouter", inPer1M: 5.00, outPer1M: 25.00, inSearch: 0.005 },

  // Anthropic direct + web_search ($10/1000 searches × ~3 rounds = $0.03)
  { id: "anthropic:claude-haiku-4-5", label: "Claude Haiku 4.5 · Anthropic direct", inPer1M: 1.00, outPer1M: 5.00, inSearch: 0.03 },
  { id: "anthropic:claude-sonnet-4-6", label: "Claude Sonnet 4.6 · Anthropic direct", inPer1M: 3.00, outPer1M: 15.00, inSearch: 0.03 },
  { id: "anthropic:claude-opus-4-7", label: "Claude Opus 4.7 · Anthropic direct", inPer1M: 5.00, outPer1M: 25.00, inSearch: 0.03 },
];

function estimateCostUSD(entry: ModelEntry, inTok = 0, outTok = 0): number {
  return (inTok * entry.inPer1M + outTok * entry.outPer1M) / 1_000_000 + entry.inSearch;
}

interface ResultRow {
  modelId: string | undefined;
  label: string;
  ok: boolean;
  model?: string;
  dossier?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  costUSD?: number;
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
    MODEL_IDS.map(async (entry): Promise<ResultRow> => {
      const { id, label } = entry;
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
          costUSD: estimateCostUSD(entry, usage?.input_tokens, usage?.output_tokens),
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
