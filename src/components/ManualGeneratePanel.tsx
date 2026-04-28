import { useEffect, useState } from "react";
import { buildDesignPrompt, extractHtmlFromPaste } from "../lib/api";
import type { BusinessDetails, GeneratedSite } from "../types";

// The three flat-rate web subscriptions we support routing the design call
// through. Each gets its own button in Step 1. The selectedProvider drives
// what we record on the saved site (model name + which API rates to use
// for the "equivalent cost" comparison).
type ProviderId = "claude" | "chatgpt" | "gemini";

interface ProviderConfig {
  label: string; // shown on the button + in the metadata
  modelLabel: string; // saved into site.model
  apiModel: string; // saved into site.api_equivalent_model for traceability
  newChatUrl: string; // opens in a new tab when the operator clicks Copy & open
  inPer1M: number; // USD per 1M input tokens on the equivalent direct API
  outPer1M: number; // USD per 1M output tokens on the equivalent direct API
}

// Rates verified from each provider's public pricing page 2026-04-28.
// Numbers are best-current-tier ("flagship" quality, what each web app
// serves to a paid subscriber):
//   claude.ai Pro/Max → Opus 4.7 (Anthropic direct rate card)
//   ChatGPT Plus/Pro → GPT-4.1 (OpenAI rate card)
//   Gemini Advanced  → Gemini 2.5 Pro (Google rate card)
const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  claude: {
    label: "Claude",
    modelLabel: "claude.ai (web)",
    apiModel: "anthropic:claude-opus-4-7",
    newChatUrl: "https://claude.ai/new",
    inPer1M: 5.0,
    outPer1M: 25.0,
  },
  chatgpt: {
    label: "ChatGPT",
    modelLabel: "chatgpt (web)",
    apiModel: "openai:gpt-4.1",
    newChatUrl: "https://chatgpt.com/",
    inPer1M: 2.0,
    outPer1M: 8.0,
  },
  gemini: {
    label: "Gemini",
    modelLabel: "gemini (web)",
    apiModel: "google:gemini-2.5-pro",
    newChatUrl: "https://gemini.google.com/app",
    inPer1M: 1.25,
    outPer1M: 10.0,
  },
};

function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

function equivalentApiCostUSD(provider: ProviderId, inTok: number, outTok: number): number {
  const cfg = PROVIDERS[provider];
  return (inTok * cfg.inPer1M + outTok * cfg.outPer1M) / 1_000_000;
}

function fmtUSD(n: number): string {
  return "$" + n.toFixed(4);
}

function fmtTokens(n: number): string {
  return n.toLocaleString("en-US");
}

interface Props {
  business: BusinessDetails;
  dossier: unknown;
  onSave: (site: GeneratedSite) => void;
  onClose: () => void;
}

// Manual-design workflow: copy the same prompt the API would have used →
// paste into claude.ai → paste the response back here → app saves it as
// the row's generated site, indistinguishable from an API run except for
// generated_by="manual".
export function ManualGeneratePanel({ business, dossier, onSave, onClose }: Props) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [chatUrl, setChatUrl] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  // Which provider the operator most recently chose to route through. Drives
  // the model name + cost rates recorded at save time so the saved site
  // metadata matches what really produced it.
  const [provider, setProvider] = useState<ProviderId>("claude");

  // Fetch the prompt once on mount. Cheap (text only, no AI), but cache it
  // in component state so toggling the panel open/closed doesn't refetch.
  useEffect(() => {
    let cancelled = false;
    setLoadingPrompt(true);
    setPromptError(null);
    buildDesignPrompt(business, dossier)
      .then((res) => {
        if (cancelled) return;
        setPrompt(res.prompt);
        setNote(`Prompt ready — ${res.chars.toLocaleString()} chars, ~${res.estimatedTokens.toLocaleString()} tokens`);
      })
      .catch((err) => {
        if (cancelled) return;
        setPromptError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingPrompt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business, dossier]);

  async function copyAndOpen(target: ProviderId) {
    if (!prompt) return;
    setProvider(target);
    const cfg = PROVIDERS[target];
    try {
      await navigator.clipboard.writeText(prompt);
      window.open(cfg.newChatUrl, "_blank", "noopener,noreferrer");
      setNote(
        `Copied. Paste in the new ${cfg.label} tab (Ctrl/Cmd+V), wait for the response, copy the HTML (Ctrl/Cmd+A then Ctrl/Cmd+C), come back here and click Paste & save. Saving as: ${cfg.label}.`,
      );
    } catch (err) {
      setNote(
        `Could not write to clipboard: ${err instanceof Error ? err.message : String(err)}. Use "Show prompt" to copy manually.`,
      );
    }
  }

  async function copyPromptOnly() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setNote(
        `Prompt copied to clipboard (~${(prompt.length / 4).toFixed(0)} tokens). Paste it into whatever AI tab you already have open.`,
      );
    } catch (err) {
      setNote(
        `Could not write to clipboard: ${err instanceof Error ? err.message : String(err)}. Use "Show prompt" to copy manually.`,
      );
    }
  }

  async function pasteFromClipboardAndSave() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setNote("Clipboard is empty. Copy Claude's HTML response first, then click again.");
        return;
      }
      saveFromText(text);
    } catch (err) {
      setNote(`Could not read clipboard: ${err instanceof Error ? err.message : String(err)}. Paste into the textarea below and click Save.`);
    }
  }

  function saveFromTextarea() {
    if (!pastedText.trim()) {
      setNote("Paste Claude's response in the textarea first.");
      return;
    }
    saveFromText(pastedText);
  }

  function saveFromText(raw: string) {
    const html = extractHtmlFromPaste(raw);
    if (!/<\/html>/i.test(html) && html.length < 200) {
      setNote(`That doesn't look like a complete HTML document (got ${html.length} chars, no </html>). Make sure you copied the full response.`);
      return;
    }
    const trimmedUrl = chatUrl.trim();
    const cfg = PROVIDERS[provider];
    const inTok = prompt ? estimateTokens(prompt) : 0;
    const outTok = estimateTokens(raw);
    const apiCost = equivalentApiCostUSD(provider, inTok, outTok);
    const site: GeneratedSite = {
      html,
      seo_keywords: [],
      generated_by: "manual",
      provider: `manual:${provider}`,
      model: cfg.modelLabel,
      input_tokens_estimate: inTok,
      output_tokens_estimate: outTok,
      api_equivalent_cost_usd: apiCost,
      api_equivalent_model: cfg.apiModel,
      ...(trimmedUrl && /^https?:\/\//i.test(trimmedUrl)
        ? { claude_chat_url: trimmedUrl }
        : {}),
    };
    // F12 log group — mirrors [generate]/[design] for symmetry. Marginal
    // cost is always $0 since the web subscription is flat-rate; the
    // dollar figure is what the same job would have billed via the API.
    console.groupCollapsed(
      `%c[manual:${provider}] DONE — ${business.name} — ~${fmtUSD(apiCost)} equivalent (${cfg.apiModel}) — $0 actual`,
      "color: #5fa; font-weight: bold;",
    );
    console.table({
      "Input (prompt)": {
        chars: prompt ? prompt.length : 0,
        tokens_est: fmtTokens(inTok),
      },
      "Output (HTML)": {
        chars: raw.length,
        tokens_est: fmtTokens(outTok),
      },
      [`Equivalent API cost (${cfg.apiModel})`]: {
        chars: "—",
        tokens_est: fmtUSD(apiCost),
      },
    });
    console.log(`Marginal cost on ${cfg.label} web subscription: $0`);
    if (trimmedUrl) console.log("Chat URL:", trimmedUrl);
    console.groupEnd();

    onSave(site);
    setPastedText("");
    setChatUrl("");
    setNote(
      `Saved as ${cfg.label} · ~${fmtTokens(inTok)} in + ~${fmtTokens(outTok)} out tokens · ~${fmtUSD(apiCost)} equivalent if API (${cfg.apiModel}) · $0 actual${trimmedUrl ? " · chat URL recorded" : ""}.`,
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-elev)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 18px 16px 18px",
        fontSize: 12.5,
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close manual panel"
        title="Close"
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          width: 26,
          height: 26,
          padding: 0,
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✕
      </button>

      <div
        style={{
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
          paddingRight: 32,
        }}
      >
        Manual generation · web subscription (free)
      </div>

      {loadingPrompt && (
        <div style={{ color: "var(--text-muted)" }}>
          <span className="spinner" /> Building prompt…
        </div>
      )}

      {promptError && (
        <div style={{ color: "var(--danger)" }}>Could not build prompt: {promptError}</div>
      )}

      {prompt && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>
              <strong style={{ color: "var(--text)" }}>Step 1.</strong> Pick a provider
              — copies the prompt to clipboard and opens a new chat in that tab. Same
              identical prompt to all three so you can compare outputs.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["claude", "chatgpt", "gemini"] as ProviderId[]).map((p) => {
                const cfg = PROVIDERS[p];
                const active = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${active ? "" : "btn-secondary"}`}
                    onClick={() => copyAndOpen(p)}
                    disabled={!prompt}
                    title={`Copy prompt and open ${cfg.label} (~$${cfg.inPer1M}/M in, $${cfg.outPer1M}/M out via API)`}
                  >
                    {active ? `→ ${cfg.label}` : `Open ${cfg.label}`}
                  </button>
                );
              })}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={copyPromptOnly}
                disabled={!prompt}
                title="Copy the prompt to clipboard without opening anything — useful when you already have an AI tab open."
              >
                Copy prompt
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowFullPrompt((v) => !v)}
              >
                {showFullPrompt ? "Hide prompt" : "Show prompt"}
              </button>
            </div>
            {showFullPrompt && (
              <textarea
                readOnly
                value={prompt}
                style={{
                  width: "100%",
                  marginTop: 8,
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  fontSize: 11,
                  background: "var(--bg-card)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  height: 200,
                  resize: "vertical",
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>
              <strong style={{ color: "var(--text)" }}>Step 2.</strong> Paste the HTML
              response from <strong style={{ color: "var(--accent)" }}>{PROVIDERS[provider].label}</strong>.
              The fastest way: copy it in that tab, come back here, click the green
              button — clipboard read + extract + save.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={pasteFromClipboardAndSave}
              >
                Paste from clipboard &amp; save as {PROVIDERS[provider].label}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={saveFromTextarea}
                disabled={!pastedText.trim()}
              >
                Save from textarea below
              </button>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Or paste Claude's response manually here…"
              spellCheck={false}
              style={{
                width: "100%",
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 11.5,
                background: "var(--bg-card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                minHeight: 100,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label
              htmlFor="claude-chat-url"
              style={{
                display: "block",
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              <strong style={{ color: "var(--text)" }}>Optional ·</strong> Claude
              chat URL — lets you reopen the conversation later to see Claude's
              reasoning or ask for tweaks.
            </label>
            <input
              id="claude-chat-url"
              type="url"
              value={chatUrl}
              onChange={(e) => setChatUrl(e.target.value)}
              placeholder="https://claude.ai/chat/…"
              spellCheck={false}
              style={{
                width: "100%",
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 11.5,
                background: "var(--bg-card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
              }}
            />
          </div>
        </>
      )}

      {note && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 8,
            background: "var(--bg-card)",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}
