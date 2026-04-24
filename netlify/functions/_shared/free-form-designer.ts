// Free-form designer: asks the LLM to produce a complete single-file HTML
// document (bilingual, editorial, Kinfolk-style) from the brand dossier.
// Replaces the old modular-template assembly for the v3 pipeline.

import type { Dossier } from "./dossier";
import { callDesigner } from "./llm";
import {
  DESIGNER_SYSTEM_FULL,
  DESIGNER_SYSTEM_RULES_ONLY,
  buildDesignerUserPrompt,
  type DesignerBusiness,
} from "./designer-prompt";

export interface FreeFormInput {
  dossier: Dossier;
  business: DesignerBusiness;
  modelId: string;
}

export interface FreeFormResult {
  html: string;
  provider: string;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  elapsedMs: number;
}

export async function designSiteFreeForm(input: FreeFormInput): Promise<FreeFormResult> {
  const t0 = Date.now();
  // For Anthropic-direct paths (options 6-8), load the `frontend-design` skill
  // natively via container.skills and only pass SitePilot-specific rules in
  // the system prompt. For all other paths (OpenRouter / Gemini), paste the
  // full skill text into the system prompt since those providers can't load
  // Anthropic skills natively.
  const isAnthropicDirect = input.modelId.startsWith("anthropic:");
  const result = await callDesigner({
    modelId: input.modelId,
    system: isAnthropicDirect ? DESIGNER_SYSTEM_RULES_ONLY : DESIGNER_SYSTEM_FULL,
    user: buildDesignerUserPrompt({ dossier: input.dossier, business: input.business }),
    maxTokens: 16000,
    anthropicSkillId: isAnthropicDirect ? "frontend-design" : undefined,
  });
  const html = extractHtml(result.text);
  if (!html) throw new Error(`Free-form designer returned no HTML. Raw: ${result.text.slice(0, 300)}`);
  return {
    html,
    provider: result.provider,
    model: result.model,
    usage: result.usage,
    elapsedMs: Date.now() - t0,
  };
}

// Extract the HTML document from the model's response. Tolerates:
// - model-added preamble ("Here's the complete HTML:")
// - code fences (```html ... ``` or ``` ... ```)
// - trailing commentary
function extractHtml(text: string): string {
  // Prefer fenced block if present
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  // Otherwise slice from the doctype or first <html onward
  const docIdx = text.search(/<!doctype\s+html/i);
  if (docIdx >= 0) return text.slice(docIdx).trim();
  const htmlIdx = text.search(/<html[\s>]/i);
  if (htmlIdx >= 0) return text.slice(htmlIdx).trim();
  return text.trim();
}
