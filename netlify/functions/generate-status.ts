// Polling endpoint. Frontend hits this every ~2s after calling
// generate-site; returns the current job status, and the site HTML
// when complete.

import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

function jsonRes(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonRes(405, { error: "GET or POST only" });
  }

  const jobId =
    event.queryStringParameters?.id ??
    event.queryStringParameters?.jobId ??
    (() => {
      try {
        return JSON.parse(event.body || "{}").jobId as string | undefined;
      } catch {
        return undefined;
      }
    })();

  if (!jobId) return jsonRes(400, { error: "Missing ?id=<jobId>" });

  let record: unknown;
  try {
    const store = getStore("sites");
    record = await store.get(jobId, { type: "json" });
  } catch (err) {
    return jsonRes(500, {
      error: `Failed to read job: ${err instanceof Error ? err.message : err}`,
    });
  }

  if (!record) return jsonRes(404, { error: "Job not found" });
  return jsonRes(200, record);
};
