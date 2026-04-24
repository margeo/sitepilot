// Polling endpoint (v2 handler). Frontend hits this every ~2s after calling
// generate-site; returns the current job status, and the site HTML when done.

import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "GET or POST only" }, { status: 405 });
  }

  const url = new URL(req.url);
  let jobId = url.searchParams.get("id") ?? url.searchParams.get("jobId") ?? undefined;

  if (!jobId && req.method === "POST") {
    try {
      const body = (await req.json()) as { jobId?: string };
      jobId = body.jobId;
    } catch {
      /* ignore */
    }
  }

  if (!jobId) {
    return Response.json({ error: "Missing ?id=<jobId>" }, { status: 400 });
  }

  let record: unknown;
  try {
    const store = getStore("sites");
    record = await store.get(jobId, { type: "json" });
  } catch (err) {
    return Response.json(
      { error: `Failed to read job: ${err instanceof Error ? err.message : err}` },
      { status: 500 },
    );
  }

  if (!record) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(record, { status: 200 });
};

export const config: Config = {
  path: "/.netlify/functions/generate-status",
};
