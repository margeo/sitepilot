// Start endpoint (v2 handler). Validates input, writes a pending job
// record into the "compares" Blob store, fires research-compare-background
// fire-and-forget, returns { jobId } in <1s. Frontend polls
// research-compare-status.ts.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

interface Body {
  business: { name: string; [k: string]: unknown };
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
  if (!body.business?.name) {
    return Response.json({ error: "business.name required" }, { status: 400 });
  }

  const jobId = randomUUID();
  const now = Date.now();

  try {
    const store = getStore("compares");
    await store.setJSON(jobId, {
      status: "pending",
      createdAt: now,
      updatedAt: now,
      businessName: body.business.name,
    });
  } catch (err) {
    return Response.json(
      { error: `Failed to write job record: ${err instanceof Error ? err.message : err}` },
      { status: 500 },
    );
  }

  // Derive base URL from the incoming request — always correct for the
  // current deploy (production or branch preview). Avoids depending on
  // DEPLOY_URL/URL env vars which can drift between deploy contexts.
  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
  const bgUrl = `${baseUrl}/.netlify/functions/research-compare-background`;
  console.log("[research-compare] dispatching to:", bgUrl);

  try {
    const res = await fetch(bgUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, business: body.business }),
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
      { error: `Failed to trigger background fn: ${err instanceof Error ? err.message : err}` },
      { status: 500 },
    );
  }

  return Response.json({ jobId, status: "pending" }, { status: 202 });
};

export const config: Config = {
  path: "/.netlify/functions/research-compare",
};
