import { useState } from "react";
import { resolveNames } from "../lib/api";
import type { BusinessBasic } from "../types";

interface Props {
  locationHint?: string;
  onImported: (businesses: BusinessBasic[], names: string[]) => void;
  onError: (msg: string) => void;
}

// Cost shown to the operator before they fire the request — Pro Text Search
// SKU price as of 2026-04-28, kept in sync with PLACES_TEXT_SEARCH_USD_PER_CALL.
const PER_NAME_USD = 0.032;

export function ManualImport({ locationHint, onImported, onError }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);

  const names = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  const dedupedCount = new Set(names.map((n) => n.toLowerCase())).size;
  const estCost = dedupedCount * PER_NAME_USD;

  async function submit() {
    if (loading || dedupedCount === 0) return;
    setLoading(true);
    setLastNote(null);
    try {
      const res = await resolveNames(names, locationHint);
      onImported(res.businesses, res.requested);
      const parts: string[] = [];
      parts.push(
        `${res.businesses.length} resolved / ${res.apiCalls} Places call${res.apiCalls === 1 ? "" : "s"} ($${(res.apiCalls * PER_NAME_USD).toFixed(3)})`,
      );
      if (res.missing.length > 0) {
        parts.push(`${res.missing.length} not found: ${res.missing.slice(0, 3).join(", ")}${res.missing.length > 3 ? "…" : ""}`);
      }
      setLastNote(parts.join(" · "));
      if (res.businesses.length > 0) setText("");
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`One business name per line — e.g.
Basilikos Restaurant Paros
Arodo
Charoula's Tavern`}
        rows={5}
        spellCheck={false}
        style={{
          width: "100%",
          fontFamily: "inherit",
          fontSize: 12.5,
          background: "var(--bg-card)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 10px",
          resize: "vertical",
          minHeight: 90,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <span>
          {dedupedCount === 0
            ? "Enter at least one name"
            : `${dedupedCount} unique name${dedupedCount === 1 ? "" : "s"} · est. $${estCost.toFixed(3)}`}
        </span>
        {locationHint && dedupedCount > 0 && (
          <span title={`Each query becomes "<name> ${locationHint}"`}>· hint: {locationHint}</span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-sm"
        disabled={loading || dedupedCount === 0}
        onClick={submit}
        style={{ width: "100%", marginTop: 8 }}
      >
        {loading ? (
          <>
            <span className="spinner" /> Resolving…
          </>
        ) : (
          `Add ${dedupedCount || ""} to results`.trim()
        )}
      </button>
      {lastNote && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{lastNote}</div>
      )}
    </div>
  );
}
