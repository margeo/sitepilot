// Standalone research endpoint. Thin wrapper over _shared/research.
import type { Handler } from "@netlify/functions";
import { researchBusiness, hasGemini, type ResearchBusiness } from "./_shared/research";

interface Body {
  business: ResearchBusiness;
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
    const { dossier, model } = await researchBusiness(body.business);
    return jsonRes(200, { dossier, model });
  } catch (err) {
    return jsonRes(500, { error: err instanceof Error ? err.message : String(err) });
  }
};
