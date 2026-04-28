// Returns the exact same prompt the design API call would have used,
// formatted as a single text block ready to paste into a fresh claude.ai
// chat. Lets the operator route the design phase through their flat-rate
// claude.ai web subscription instead of paying per-token via the API.
//
// No AI calls — pure prompt assembly. Free.

import type { Handler } from "@netlify/functions";
import {
  DESIGNER_SYSTEM_FULL,
  buildDesignerUserPrompt,
  type DesignerBusiness,
} from "./_shared/designer-prompt";
import type { Dossier } from "./_shared/dossier";

interface Body {
  business: DesignerBusiness;
  dossier: Dossier;
  // When set, relative photo URLs (/.netlify/functions/photos?...) are
  // rewritten to absolute (${origin}/.netlify/functions/photos?...) so a
  // claude.ai project that pre-fetches URLs sees real images. Pure chat
  // without URL fetching ignores the difference.
  origin?: string;
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
    return jsonRes(400, { error: "Invalid JSON" });
  }
  if (!body.business?.name || !body.dossier) {
    return jsonRes(400, { error: "business.name and dossier are required" });
  }

  const userPrompt = buildDesignerUserPrompt({ business: body.business, dossier: body.dossier });
  const combined = `${DESIGNER_SYSTEM_FULL}\n\n---\n\n${userPrompt}`;
  const finalPrompt = body.origin
    ? combined.replace(
        /\/\.netlify\/functions\/photos/g,
        `${body.origin}/.netlify/functions/photos`,
      )
    : combined;

  return jsonRes(200, {
    prompt: finalPrompt,
    chars: finalPrompt.length,
    estimatedTokens: Math.round(finalPrompt.length / 4),
  });
};
