// Thin start endpoint (v2 handler — Request/Response — so Netlify Blobs
// auto-configures its runtime context). Validates input, writes a pending
// job record to Netlify Blobs, fires the background function, and returns
// {jobId} in <1s. Actual generation runs in generate-site-background.ts;
// the frontend polls generate-status.ts for the result.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

// No default — the caller must explicitly pick both a design and a research
// model from the frontend. Missing or unknown ids return 400.
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
  researchModelId?: string;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const business = body.business;
  if (!business?.name) {
    return Response.json({ error: "business.name required" }, { status: 400 });
  }
  if (!body.modelId || !ALLOWED_MODELS.has(body.modelId)) {
    return Response.json(
      { error: "Valid modelId is required (pick a design model in the UI)" },
      { status: 400 },
    );
  }
  if (!body.researchModelId || !ALLOWED_MODELS.has(body.researchModelId)) {
    return Response.json(
      { error: "Valid researchModelId is required (pick a research model in the UI)" },
      { status: 400 },
    );
  }

  const modelId = body.modelId;
  const researchModelId = body.researchModelId;
  const jobId = randomUUID();
  const now = Date.now();

  try {
    const store = getStore("sites");
    await store.setJSON(jobId, {
      status: "pending",
      createdAt: now,
      updatedAt: now,
      modelId,
      researchModelId,
      businessName: business.name,
    });
  } catch (err) {
    return Response.json(
      {
        error: `Failed to write job record: ${err instanceof Error ? err.message : err}`,
      },
      { status: 500 },
    );
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";
  const bgUrl = `${baseUrl}/.netlify/functions/generate-site-background`;

  try {
    const res = await fetch(bgUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, modelId, researchModelId, business }),
    });
    if (res.status !== 202 && res.status !== 200) {
      const txt = await res.text();
      return Response.json(
        { error: `Background fn returned ${res.status}: ${txt.slice(0, 200)}` },
        { status: 500 },
      );
    }
  } catch (err) {
    return Response.json(
      {
        error: `Failed to trigger background fn: ${err instanceof Error ? err.message : err}`,
      },
      { status: 500 },
    );
  }

  return Response.json({ jobId, status: "pending", modelId, researchModelId }, { status: 202 });
};

export const config: Config = {
  path: "/.netlify/functions/generate-site",
};
