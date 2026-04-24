import Anthropic from "@anthropic-ai/sdk";

export interface LLMInput {
  system: string;
  user: string;
  images?: string[]; // data URLs (data:image/png;base64,...) or https:// URLs
  maxTokens?: number;
}

export interface LLMResult {
  text: string;
  provider: "openrouter" | "anthropic";
  model: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OR_MODEL = "google/gemini-3.1-flash-lite-preview";

export function hasLLM(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function callLLM(input: LLMInput): Promise<LLMResult> {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    const model = process.env.OPENROUTER_MODEL || DEFAULT_OR_MODEL;
    const text = await callOpenRouter(orKey, model, input);
    return { text, provider: "openrouter", model };
  }
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (anthKey) {
    const model = "claude-sonnet-4-6";
    const text = await callAnthropic(anthKey, model, input);
    return { text, provider: "anthropic", model };
  }
  throw new Error("No LLM provider configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)");
}

async function callOpenRouter(key: string, model: string, input: LLMInput): Promise<string> {
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: input.user }];
  for (const img of input.images ?? []) {
    userContent.push({ type: "image_url", image_url: { url: img } });
  }
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://sitepilot-app.netlify.app",
      "X-Title": "SitePilot",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: userContent },
      ],
      max_tokens: input.maxTokens ?? 900,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenRouter returned empty content");
  return text;
}

async function callAnthropic(key: string, model: string, input: LLMInput): Promise<string> {
  const client = new Anthropic({ apiKey: key });
  type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: AnthropicMediaType; data: string } }
  > = [{ type: "text", text: input.user }];
  for (const img of input.images ?? []) {
    const m = img.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
    if (m) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: m[1] as AnthropicMediaType, data: m[2] },
      });
    }
  }
  const msg = await client.messages.create({
    model,
    max_tokens: input.maxTokens ?? 900,
    system: input.system,
    messages: [{ role: "user", content: userContent }],
  });
  const block = msg.content.find((c) => c.type === "text");
  return block && "text" in block ? block.text : "";
}
