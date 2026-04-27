// TEMPORARY test endpoint. Fires the SAME query N times back-to-back (fresh
// page 1 each time, no pageToken) to see whether Google returns variation
// across identical calls. Hypothesis: deterministic — same 20 every time.
//
// Usage: GET /.netlify/functions/search-test?location=Symi%2C%20Greece&n=6

import type { Handler } from "@netlify/functions";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

interface Place {
  place_id: string;
  name: string;
}

async function singleCall(apiKey: string, textQuery: string): Promise<Place[]> {
  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({ textQuery, pageSize: 20 }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn(`[search-test] ${res.status}: ${t.slice(0, 200)}`);
    return [];
  }
  const data = (await res.json()) as {
    places?: Array<{ id: string; displayName?: { text?: string } }>;
  };
  return (data.places ?? []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text ?? "",
  }));
}

function jsonRes(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body, null, 2),
  };
}

export const handler: Handler = async (event) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return jsonRes(500, { error: "GOOGLE_MAPS_API_KEY not set" });

  const location = event.queryStringParameters?.location?.trim();
  if (!location) return jsonRes(400, { error: "Pass ?location=..." });
  const n = Math.max(1, Math.min(20, Number(event.queryStringParameters?.n ?? 6)));

  const query = `hotels in ${location}`;
  const t0 = Date.now();

  // Run sequentially so each call is independent (parallel is fine too;
  // sequential just makes the timing cleaner).
  const calls: Place[][] = [];
  for (let i = 0; i < n; i++) {
    calls.push(await singleCall(apiKey, query));
  }
  const elapsedMs = Date.now() - t0;

  const seen = new Set<string>();
  const perCall = calls.map((batch, i) => {
    const newOnes = batch.filter((b) => !seen.has(b.place_id));
    for (const b of newOnes) seen.add(b.place_id);
    return {
      callIndex: i + 1,
      returned: batch.length,
      uniqueAdded: newOnes.length,
      newNames: newOnes.map((b) => b.name),
      allNames: batch.map((b) => b.name),
    };
  });

  // Identical-order check: are all calls returning the exact same sequence?
  const firstSig = calls[0].map((p) => p.place_id).join("|");
  const allIdentical = calls.every((c) => c.map((p) => p.place_id).join("|") === firstSig);

  return jsonRes(200, {
    query,
    n,
    totalCalls: n,
    totalUnique: seen.size,
    totalReturned: calls.reduce((s, b) => s + b.length, 0),
    allCallsIdentical: allIdentical,
    elapsedMs,
    perCall,
  });
};
