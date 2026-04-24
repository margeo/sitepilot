import type { Handler } from "@netlify/functions";

interface Body {
  input: string;
}

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
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
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonRes(400, { error: "Invalid JSON body" });
  }

  const input = (body.input ?? "").trim();
  if (input.length < 2) return jsonRes(200, { suggestions: [] });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return jsonRes(200, { suggestions: [] });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: [
          "locality",
          "sublocality",
          "administrative_area_level_1",
          "administrative_area_level_2",
          "country",
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return jsonRes(500, { error: `Autocomplete failed (${res.status}): ${errText}` });
    }
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };
    const suggestions: Suggestion[] = (data.suggestions ?? [])
      .filter((s) => s.placePrediction)
      .map((s) => {
        const p = s.placePrediction!;
        return {
          placeId: p.placeId,
          description: p.text?.text ?? "",
          mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          secondaryText: p.structuredFormat?.secondaryText?.text,
        };
      });
    return jsonRes(200, { suggestions });
  } catch (err) {
    return jsonRes(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
