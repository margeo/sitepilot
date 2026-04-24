// Thin start endpoint. Validates input, writes a pending job record to
// Netlify Blobs, fires the background function, and returns {jobId} in <1s.
// The actual generation runs in generate-site-background.ts; the frontend
// polls generate-status.ts for the result.

import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

const DEFAULT_MODEL = "openrouter:google/gemini-3.1-flash-lite-preview";
const ALLOWED_MODELS = new Set([
  "openrouter:google/gemini-3.1-flash-lite-preview",
  "openrouter:google/gemini-3.1-pro-preview",
  "openrouter:anthropic/claude-haiku-4.5",
  "openrouter:anthropic/claude-sonnet-4.6",
  "openrouter:anthropic/claude-opus-4.7",
  "anthropic:claude-haiku-4-5",
  "anthropic:claude-sonnet-4-6",
  "anthropic:claude-opus-4-7",
]);

interface Body {
  business: {
    name: string;
    [k: string]: unknown;
  };
  modelId?: string;
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

  let body: Body;
  try {
    body = JSON.parse(event.body || "{}") as Body;
  } catch {
    return jsonRes(400, { error: "Invalid JSON" });
  }
  const business = body.business;
  if (!business?.name) return jsonRes(400, { error: "business.name required" });

  const modelId = body.modelId && ALLOWED_MODELS.has(body.modelId) ? body.modelId : DEFAULT_MODEL;
  const jobId = randomUUID();
  const now = Date.now();

  try {
    const store = getStore("sites");
    await store.setJSON(jobId, {
      status: "pending",
      createdAt: now,
      updatedAt: now,
      modelId,
      businessName: business.name,
    });
  } catch (err) {
    return jsonRes(500, {
      error: `Failed to write job record: ${err instanceof Error ? err.message : err}`,
    });
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";
  const bgUrl = `${baseUrl}/.netlify/functions/generate-site-background`;

  try {
    // Await the 202 acknowledgement so we know the background fn was scheduled.
    // The bg fn itself then runs asynchronously up to 15 min.
    const res = await fetch(bgUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, modelId, business }),
    });
    if (res.status !== 202 && res.status !== 200) {
      const txt = await res.text();
      return jsonRes(500, {
        error: `Background fn returned ${res.status}: ${txt.slice(0, 200)}`,
      });
    }
  } catch (err) {
    return jsonRes(500, {
      error: `Failed to trigger background fn: ${err instanceof Error ? err.message : err}`,
    });
  }

  return jsonRes(202, { jobId, status: "pending", modelId });
};
