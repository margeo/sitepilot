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

// The frontend sends the cached BusinessDetails (which has photo_refs but
// no photo_urls). buildDesignerUserPrompt expects photo_urls — the API
// path converts them inside generate-site-background.ts. We do the same
// conversion here so the manual path doesn't end up with
// "(none — use labelled SVG placeholders)" in the prompt.
interface IncomingBusiness extends DesignerBusiness {
  photo_refs?: string[];
}

interface Body {
  business: IncomingBusiness;
  dossier: Dossier;
  // When set, relative photo URLs (/.netlify/functions/photos?...) are
  // rewritten to absolute (${origin}/.netlify/functions/photos?...) so
  // <img src> tags in the generated HTML resolve in any browser context
  // (claude.ai chat preview, downloaded file, blob URL, etc.). Without
  // origin we'd emit relative paths that only work inside the SitePilot
  // tab's iframe.
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

  // Mirror generate-site-background.ts: derive photo_urls from photo_refs
  // when the caller didn't pre-build them. Cap at 10 to match the API path.
  const businessForPrompt: DesignerBusiness = {
    ...body.business,
    photo_urls:
      body.business.photo_urls && body.business.photo_urls.length > 0
        ? body.business.photo_urls
        : (body.business.photo_refs ?? [])
            .slice(0, 10)
            .map((ref) => `/.netlify/functions/photos?reference=${encodeURIComponent(ref)}&maxwidth=1600`),
  };

  const userPrompt = buildDesignerUserPrompt({ business: businessForPrompt, dossier: body.dossier });
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
