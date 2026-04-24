import type { Handler, HandlerResponse } from "@netlify/functions";

// Proxies Google Place Photos (New) API so images can be served without leaking the API key.
export const handler: Handler = async (event): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET")
    return { statusCode: 405, body: "GET only" };

  const ref = event.queryStringParameters?.reference;
  const maxwidth = Number(event.queryStringParameters?.maxwidth ?? "1200");
  if (!ref) return { statusCode: 400, body: "Missing reference" };

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 302,
      headers: {
        Location: `https://picsum.photos/seed/${encodeURIComponent(ref)}/${maxwidth}/${Math.round(maxwidth * 0.66)}`,
      },
      body: "",
    };
  }

  // Photo resource name looks like: places/XYZ/photos/ABC
  // Endpoint: GET /v1/{name}/media?maxWidthPx=...
  const url = `https://places.googleapis.com/v1/${encodeURIComponent(ref).replace(/%2F/g, "/")}/media?maxWidthPx=${maxwidth}&key=${apiKey}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return { statusCode: res.status, body: `Photo fetch failed: ${res.status}` };
    }
    const arrayBuf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return {
      statusCode: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
      body: Buffer.from(arrayBuf).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err instanceof Error ? err.message : String(err),
    };
  }
};
