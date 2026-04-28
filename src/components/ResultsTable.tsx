import { useState, type ReactNode } from "react";
import type { BusinessBasic, BusinessDetails, GeneratedSite } from "../types";
import { SitePreview } from "./SitePreview";
import { ManualGeneratePanel } from "./ManualGeneratePanel";

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
  // Per-row generated-site cache. Each entry has the produced HTML +
  // metadata (site) and the enriched business object that SitePreview
  // needs (business). Both are persisted to localStorage by App.tsx.
  siteByPlaceId?: ReadonlyMap<string, GeneratedSite>;
  businessByPlaceId?: ReadonlyMap<string, BusinessDetails>;
  // Save handler for the manual (claude.ai web) generation path.
  onManualSiteSave?: (placeId: string, site: GeneratedSite) => void;
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

function DossierPanel({
  dossier,
  business,
  onClose,
}: {
  dossier: DossierShape;
  business?: BusinessDetails;
  onClose: () => void;
}) {
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
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dossier"
        title="Close dossier"
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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-card)";
          e.currentTarget.style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        ✕
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          paddingRight: 32,
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

      {business && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px dashed var(--border)",
          }}
        >
          <div
            style={{
              color: "var(--accent)",
              fontWeight: 700,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Google Places data
          </div>
          <BusinessFacts business={business} />
        </div>
      )}
    </div>
  );
}

function BusinessFacts({ business: b }: { business: BusinessDetails }) {
  const phonesAll = [...(b.phones?.mobiles ?? []), ...(b.phones?.landlines ?? [])];
  const reviewsTop = (b.reviews ?? []).slice(0, 3);
  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, marginBottom: 6 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
  return (
    <div>
      <Row label="Lead score">
        {b.lead_score}/10
        {b.lead_score_reasons && b.lead_score_reasons.length > 0 && (
          <span style={{ color: "var(--text-muted)" }}> · {b.lead_score_reasons.join(" · ")}</span>
        )}
      </Row>
      <Row label="Rating">
        {typeof b.rating === "number" ? `★ ${b.rating.toFixed(1)}` : "—"}
        <span style={{ color: "var(--text-muted)" }}> · {b.user_ratings_total ?? 0} reviews</span>
      </Row>
      <Row label="Mobiles">
        {b.phones?.mobiles?.length ? b.phones.mobiles.join(", ") : <em style={{ color: "var(--text-muted)" }}>—</em>}
      </Row>
      <Row label="Landlines">
        {b.phones?.landlines?.length ? b.phones.landlines.join(", ") : <em style={{ color: "var(--text-muted)" }}>—</em>}
      </Row>
      {phonesAll.length === 0 && (
        <Row label="">
          <span style={{ color: "var(--warn)", fontSize: 11 }}>
            No phone numbers from Google — site CTAs will fall back to map link only.
          </span>
        </Row>
      )}
      <Row label="Photos">{b.photo_refs?.length ?? 0}</Row>
      {b.opening_hours && b.opening_hours.length > 0 && (
        <Row label="Hours">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {b.opening_hours.map((line, i) => (
              <li key={i} style={{ listStyle: "none" }}>{line}</li>
            ))}
          </ul>
        </Row>
      )}
      {b.editorial_summary && (
        <Row label="Google blurb">
          <em>{b.editorial_summary}</em>
        </Row>
      )}
      {b.primary_type_display && <Row label="Primary type">{b.primary_type_display}</Row>}
      {b.google_maps_uri && (
        <Row label="Maps URL">
          <a
            href={b.google_maps_uri}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            open in Google Maps
          </a>
        </Row>
      )}
      <Row label="Place ID">
        <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.place_id}</code>
      </Row>
      {reviewsTop.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Top reviews:</div>
          {reviewsTop.map((r, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <strong style={{ fontSize: 12 }}>{r.author ?? "Guest"}</strong>
              {typeof r.rating === "number" && (
                <span style={{ color: "var(--text-muted)" }}> · ★ {r.rating}</span>
              )}
              {r.relative_time && (
                <span style={{ color: "var(--text-muted)" }}> · {r.relative_time}</span>
              )}
              <div style={{ fontStyle: "italic" }}>{r.text}</div>
            </div>
          ))}
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
  siteByPlaceId,
  businessByPlaceId,
  onManualSiteSave,
}: Props) {
  // Place_ids whose dossier panel the user has manually closed. The dossier
  // itself stays cached in researchedIds (so Generate site still works);
  // only the panel UI is hidden.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  // Same pattern for the per-row generated-site preview panel.
  const [collapsedSiteIds, setCollapsedSiteIds] = useState<Set<string>>(() => new Set());
  // Place_ids whose manual-generation panel is currently open. Closed by
  // default; opened by clicking the "Manual" button on a researched row.
  const [manualOpenIds, setManualOpenIds] = useState<Set<string>>(() => new Set());

  function toggleManualPanel(placeId: string) {
    setManualOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function closePanel(placeId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.add(placeId);
      return next;
    });
  }

  function togglePanel(placeId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function closeSitePanel(placeId: string) {
    setCollapsedSiteIds((prev) => {
      const next = new Set(prev);
      next.add(placeId);
      return next;
    });
  }

  function toggleSitePanel(placeId: string) {
    setCollapsedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function handleResearchClick(b: BusinessBasic) {
    // Re-clicking Research auto-reopens a previously closed panel — the
    // user explicitly asked for fresh dossier output, so showing it makes
    // sense.
    setCollapsedIds((prev) => {
      if (!prev.has(b.place_id)) return prev;
      const next = new Set(prev);
      next.delete(b.place_id);
      return next;
    });
    onResearch(b);
  }

  function handleGenerateClick(b: BusinessBasic) {
    // Same auto-reopen rule for the site panel — clicking Re-generate
    // means the user wants to see the new output.
    setCollapsedSiteIds((prev) => {
      if (!prev.has(b.place_id)) return prev;
      const next = new Set(prev);
      next.delete(b.place_id);
      return next;
    });
    onSelect(b);
  }

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
        const isPanelOpen = isResearched && !collapsedIds.has(b.place_id);
        const cachedSite = siteByPlaceId?.get(b.place_id);
        const cachedBusiness = businessByPlaceId?.get(b.place_id);
        const isSiteCached = Boolean(cachedSite && cachedBusiness);
        const isSitePanelOpen = isSiteCached && !collapsedSiteIds.has(b.place_id);
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
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {isResearched && (
                  <button
                    type="button"
                    onClick={() => togglePanel(b.place_id)}
                    title={
                      isPanelOpen
                        ? "Hide cached dossier"
                        : "Show cached dossier (no API call)"
                    }
                    aria-label={isPanelOpen ? "Hide dossier" : "Show dossier"}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isPanelOpen ? "var(--accent)" : "var(--text-muted)",
                      background: isPanelOpen ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${isPanelOpen ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 999,
                      padding: "2px 8px",
                      cursor: "pointer",
                      lineHeight: 1.2,
                    }}
                  >
                    {isPanelOpen ? "✓ dossier" : "▸ dossier"}
                  </button>
                )}
                {isSiteCached && (
                  <button
                    type="button"
                    onClick={() => toggleSitePanel(b.place_id)}
                    title={
                      isSitePanelOpen
                        ? "Hide cached site preview"
                        : "Show cached site preview (no API call)"
                    }
                    aria-label={isSitePanelOpen ? "Hide site" : "Show site"}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isSitePanelOpen ? "var(--accent)" : "var(--text-muted)",
                      background: isSitePanelOpen ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${isSitePanelOpen ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 999,
                      padding: "2px 8px",
                      cursor: "pointer",
                      lineHeight: 1.2,
                    }}
                  >
                    {isSitePanelOpen ? "✓ site" : "▸ site"}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={anyBusy}
                  onClick={() => handleResearchClick(b)}
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
                  onClick={() => handleGenerateClick(b)}
                  title={
                    !isResearched
                      ? "Click Research first — Generate site uses the cached dossier"
                      : "Generate via API (paid, automated)"
                  }
                  style={!isResearched ? { opacity: 0.55 } : undefined}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner" />
                      Building…
                    </>
                  ) : isSiteCached ? (
                    "Re-generate"
                  ) : (
                    "Generate site"
                  )}
                </button>
                {onManualSiteSave && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={!isResearched || anyBusy}
                    onClick={() => toggleManualPanel(b.place_id)}
                    title={
                      !isResearched
                        ? "Click Research first — manual generation uses the cached dossier"
                        : "Generate via claude.ai web (free, copy-paste workflow)"
                    }
                    style={!isResearched ? { opacity: 0.55 } : undefined}
                  >
                    {manualOpenIds.has(b.place_id) ? "Manual ▴" : "Manual"}
                  </button>
                )}
              </div>
            </div>
            {isPanelOpen && dossier && (
              <DossierPanel
                dossier={dossier}
                business={cachedBusiness}
                onClose={() => closePanel(b.place_id)}
              />
            )}
            {manualOpenIds.has(b.place_id) &&
              isResearched &&
              dossier &&
              cachedBusiness &&
              onManualSiteSave && (
                <ManualGeneratePanel
                  business={cachedBusiness}
                  dossier={dossier}
                  onSave={(site) => {
                    onManualSiteSave(b.place_id, site);
                    setManualOpenIds((prev) => {
                      const next = new Set(prev);
                      next.delete(b.place_id);
                      return next;
                    });
                    setCollapsedSiteIds((prev) => {
                      if (!prev.has(b.place_id)) return prev;
                      const next = new Set(prev);
                      next.delete(b.place_id);
                      return next;
                    });
                  }}
                  onClose={() => toggleManualPanel(b.place_id)}
                />
              )}
            {isSitePanelOpen && cachedSite && cachedBusiness && (
              <div
                style={{
                  position: "relative",
                  background: "var(--bg-elev)",
                  borderBottom: "1px solid var(--border)",
                  padding: "8px 16px 16px 16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => closeSitePanel(b.place_id)}
                  aria-label="Close site preview"
                  title="Close site preview"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 16,
                    zIndex: 2,
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-card)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  ✕
                </button>
                <SitePreview business={cachedBusiness} site={cachedSite} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
