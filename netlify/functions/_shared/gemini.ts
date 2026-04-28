// Direct Gemini API client. Used when we need Google Search grounding
// (a Gemini-specific feature that OpenRouter cannot proxy).

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GroundedRequest {
  model?: string;
  systemInstruction: string;
  prompt: string;
  enableSearch?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GroundedResponse {
  text: string;
  groundingSources: Array<{ title?: string; uri?: string; snippet?: string }>;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function callGemini(input: GroundedRequest): Promise<GroundedResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = input.model || process.env.GEMINI_RESEARCH_MODEL || "gemini-2.5-flash";

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: {
      temperature: input.temperature ?? 0.4,
      maxOutputTokens: input.maxOutputTokens ?? 2000,
    },
  };
  if (input.enableSearch) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        groundingSupports?: Array<{ segment?: { text?: string } }>;
      };
    }>;
    modelVersion?: string;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const supports = data.candidates?.[0]?.groundingMetadata?.groundingSupports ?? [];
  const sourceSnippets = supports.map((s) => s.segment?.text ?? "");
  const groundingSources = chunks.map((c, i) => ({
    title: c.web?.title,
    uri: c.web?.uri,
    snippet: sourceSnippets[i],
  }));

  // Prefer modelVersion from response payload (the actual served model).
  // Falls back to requested model if Gemini omits it for some reason.
  return {
    text,
    groundingSources,
    model: data.modelVersion || model,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount,
      output_tokens: data.usageMetadata?.candidatesTokenCount,
    },
  };
}
