// Compares all 9 research-model paths in parallel on the SAME business so
// we can judge dossier quality, grounding depth, sources, token cost, and
// latency side-by-side. Useful for picking which model to run for a given
// quality/cost tradeoff.
//
// POST body: { business: ResearchBusiness }
// Response: { results: [{ modelId, model, dossier, usage, elapsedMs, error }] }
//
// Note: hits 9 paid LLM APIs in one call. ~$0.30-1.00 per comparison run
// depending on which models are reachable. Use sparingly.

import type { Handler } from "@netlify/functions";
import { researchBusiness, hasGemini, type ResearchBusiness } from "./_shared/research";

interface Body {
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

function jsonRes(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body, null, 2),
  };
}

interface ResultRow {
  modelId: string | undefined;
  label: string;
  ok: boolean;
  model?: string;
  dossier?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  elapsedMs: number;
  error?: string;
  // Convenience derived fields for at-a-glance comparison
  sourcesCount?: number;
  signatureCount?: number;
  reviewHighlightsCount?: number;
  confidence?: number;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  if (!hasGemini() && !process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return jsonRes(500, { error: "No LLM provider keys configured" });
  }

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}") as Body;
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  if (!body.business?.name) return jsonRes(400, { error: "business.name required" });

  const tStart = Date.now();

  // Fire all 9 in parallel. Use allSettled so one failure doesn't break the rest.
  const settled = await Promise.allSettled(
    MODEL_IDS.map(async ({ id, label }): Promise<ResultRow> => {
      const t0 = Date.now();
      try {
        const { dossier, model, usage } = await researchBusiness(body.business, id);
        const d = dossier as {
          sources?: Array<unknown>;
          signature_elements?: Array<unknown>;
          review_highlights?: Array<unknown>;
          confidence?: number;
        };
        return {
          modelId: id,
          label,
          ok: true,
          model,
          dossier,
          usage,
          elapsedMs: Date.now() - t0,
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
          elapsedMs: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const results: ResultRow[] = settled.map((s) =>
    s.status === "fulfilled"
      ? s.value
      : { modelId: undefined, label: "(promise rejected)", ok: false, elapsedMs: 0, error: String(s.reason) },
  );

  return jsonRes(200, {
    business: body.business.name,
    totalElapsedMs: Date.now() - tStart,
    results,
  });
};
