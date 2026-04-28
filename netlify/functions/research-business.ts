// Standalone research endpoint. Thin wrapper over _shared/research.
// Accepts an optional `researchModelId` to test different model paths
// (Gemini default vs OpenRouter :online vs Anthropic web_search) on the
// same business without triggering the full generate-site pipeline.
import type { Handler } from "@netlify/functions";
import { researchBusiness, hasGemini, type ResearchBusiness } from "./_shared/research";

interface Body {
  business: ResearchBusiness;
  researchModelId?: string; // e.g. "openrouter:google/gemini-3.1-pro-preview", "anthropic:claude-sonnet-4-6"
}

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonRes(405, { error: "POST only" });
  if (!hasGemini()) return jsonRes(500, { error: "GEMINI_API_KEY not set" });

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}") as Body;
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  if (!body.business?.name) return jsonRes(400, { error: "business.name required" });

  try {
    const t0 = Date.now();
    const { dossier, model, usage } = await researchBusiness(body.business, body.researchModelId);
    const elapsedMs = Date.now() - t0;
    return jsonRes(200, { dossier, model, usage, elapsedMs });
  } catch (err) {
    return jsonRes(500, { error: err instanceof Error ? err.message : String(err) });
  }
};
