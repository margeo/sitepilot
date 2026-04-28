import { useEffect, useState } from "react";
import { buildDesignPrompt, extractHtmlFromPaste } from "../lib/api";
import type { BusinessDetails, GeneratedSite } from "../types";

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
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

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

  async function copyAndOpenClaude() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
      setNote("Copied. Paste it in the new Claude tab (Ctrl/Cmd+V), wait for the response, copy the HTML (Ctrl/Cmd+A then Ctrl/Cmd+C), come back here and click Paste & save.");
    } catch (err) {
      setNote(`Could not write to clipboard: ${err instanceof Error ? err.message : String(err)}. Use the "Show prompt" button below to copy manually.`);
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
    const site: GeneratedSite = {
      html,
      seo_keywords: [],
      generated_by: "manual",
      provider: "manual",
      model: "claude.ai (web)",
    };
    onSave(site);
    setPastedText("");
    setNote("Saved. The site preview should now appear under this row.");
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
        Manual generation · via claude.ai (free)
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
              <strong style={{ color: "var(--text)" }}>Step 1.</strong> Copy the designer
              prompt and open a new Claude chat. Paste the prompt there and let Claude
              produce the HTML.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={copyAndOpenClaude}
                disabled={!prompt}
              >
                Copy prompt &amp; open Claude
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
              <strong style={{ color: "var(--text)" }}>Step 2.</strong> Paste Claude's HTML
              response. The fastest way: copy it in the Claude tab, come back here, click
              the green button — it reads from clipboard, extracts the HTML, and saves.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={pasteFromClipboardAndSave}
              >
                Paste from clipboard &amp; save
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
