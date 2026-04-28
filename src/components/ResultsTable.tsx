import type { BusinessBasic } from "../types";

interface Props {
  results: BusinessBasic[];
  onSelect: (b: BusinessBasic) => void;
  onResearch: (b: BusinessBasic) => void;
  selectedId?: string;
  loadingId?: string;
  researchingId?: string;
  // place_ids that have a cached dossier — drives the "Re-research" label and
  // unlocks the Generate site button visually (Generate site itself enforces
  // this server-checkable rule too).
  researchedIds?: ReadonlyMap<string, unknown>;
}

// Loose shape of the dossier returned by /research-business. Mirrors the
// backend Dossier interface but with everything optional so the panel
// renders gracefully even when the model partially filled the JSON.
interface DossierShape {
  category_descriptor?: string | null;
  location_notes?: string | null;
  season?: string | null;
  social?: {
    instagram?: string | null;
    facebook?: string | null;
    tripadvisor?: string | null;
    airbnb?: string | null;
    booking?: string | null;
    website?: string | null;
  } | null;
  brand_identity?: {
    vibe?: string | null;
    keywords?: string[] | null;
    target_audience?: string | null;
    unique_story?: string | null;
  } | null;
  signature_elements?: string[] | null;
  review_highlights?: Array<{ quote?: string | null; theme?: string | null }> | null;
  confidence?: number | null;
  sources?: Array<{ title?: string | null; uri?: string | null }> | null;
}

function DossierPanel({ dossier }: { dossier: DossierShape }) {
  const bi = dossier.brand_identity ?? {};
  const sig = dossier.signature_elements ?? [];
  const reviews = dossier.review_highlights ?? [];
  const sources = dossier.sources ?? [];
  const social = dossier.social ?? {};
  const socialEntries = Object.entries(social).filter(
    ([, v]) => typeof v === "string" && v && v.trim().length > 0,
  ) as Array<[string, string]>;
  const confidencePct =
    typeof dossier.confidence === "number"
      ? Math.round(dossier.confidence * 100)
      : null;

  return (
    <div
      style={{
        background: "var(--bg-elev)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 18px 16px 18px",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        <span>✓ Dossier</span>
        {dossier.category_descriptor && (
          <span
            style={{
              color: "var(--text-muted)",
              fontWeight: 500,
              textTransform: "none",
              letterSpacing: 0,
              fontSize: 12,
            }}
          >
            {dossier.category_descriptor}
            {dossier.season ? ` · ${dossier.season}` : ""}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontWeight: 500, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>
          {confidencePct !== null && <>confidence: {confidencePct}% · </>}
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </span>
      </div>

      {bi.vibe && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>Vibe: </span>
          <span style={{ fontStyle: "italic" }}>{bi.vibe}</span>
        </div>
      )}

      {bi.unique_story && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ color: "var(--text-muted)" }}>Story: </span>
          <span>{bi.unique_story}</span>
        </div>
      )}

      {bi.target_audience && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ color: "var(--text-muted)" }}>Audience: </span>
          <span>{bi.target_audience}</span>
        </div>
      )}

      {sig.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Signature elements:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {sig.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {bi.keywords && bi.keywords.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ color: "var(--text-muted)", marginRight: 4 }}>Keywords:</span>
          {bi.keywords.map((k, i) => (
            <span
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "1px 8px",
                fontSize: 11,
              }}
            >
              {k}
            </span>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Review highlights:</div>
          {reviews.map((r, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <span style={{ fontStyle: "italic" }}>“{r.quote}”</span>
              {r.theme && <span style={{ color: "var(--text-muted)" }}> — {r.theme}</span>}
            </div>
          ))}
        </div>
      )}

      {socialEntries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>Social:</span>
          {socialEntries.map(([k, v]) => {
            const looksLikeUrl = /^https?:\/\//i.test(v);
            return looksLikeUrl ? (
              <a
                key={k}
                href={v}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                {k}
              </a>
            ) : (
              <span key={k}>
                <span style={{ color: "var(--text-muted)" }}>{k}: </span>
                {v}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ResultsTable({
  results,
  onSelect,
  onResearch,
  selectedId,
  loadingId,
  researchingId,
  researchedIds,
}: Props) {
  if (results.length === 0) return null;

  return (
    <div className="results-table">
      <div className="results-row header">
        <div>Business</div>
        <div>Rating</div>
        <div>Reviews</div>
        <div>Website?</div>
        <div>Action</div>
      </div>
      {results.map((b) => {
        const isSelected = selectedId === b.place_id;
        const isGenerating = loadingId === b.place_id;
        const isResearching = researchingId === b.place_id;
        const dossier = researchedIds?.get(b.place_id) as DossierShape | undefined;
        const isResearched = Boolean(dossier);
        const anyBusy = isGenerating || isResearching;
        return (
          <div key={b.place_id}>
            <div
              className="results-row"
              style={isSelected ? { background: "var(--accent-soft)" } : undefined}
            >
              <div>
                <div className="biz-name">{b.name}</div>
                <div className="biz-addr">{b.address}</div>
              </div>
              <div className="rating-cell">
                {b.rating ? (
                  <>
                    <span>★</span>
                    <span>{b.rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div>{b.user_ratings_total ?? 0}</div>
              <div>
                {b.has_website ? (
                  <span className="badge red">Yes</span>
                ) : (
                  <span className="badge green">No</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {isResearched && (
                  <span
                    title="Dossier cached — click Generate site to use it"
                    style={{
                      fontSize: 14,
                      color: "var(--accent, #5fa)",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={anyBusy}
                  onClick={() => onResearch(b)}
                >
                  {isResearching ? (
                    <>
                      <span className="spinner" />
                      Researching…
                    </>
                  ) : isResearched ? (
                    "Re-research"
                  ) : (
                    "Research"
                  )}
                </button>
                <button
                  className="btn btn-sm"
                  disabled={anyBusy}
                  onClick={() => onSelect(b)}
                  title={
                    !isResearched
                      ? "Click Research first — Generate site uses the cached dossier"
                      : undefined
                  }
                  style={!isResearched ? { opacity: 0.55 } : undefined}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner" />
                      Building…
                    </>
                  ) : isSelected ? (
                    "Re-generate"
                  ) : (
                    "Generate site"
                  )}
                </button>
              </div>
            </div>
            {isResearched && dossier && <DossierPanel dossier={dossier} />}
          </div>
        );
      })}
    </div>
  );
}
