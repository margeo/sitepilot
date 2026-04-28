import { useEffect, useState } from "react";
import "./App.css";
import { SearchForm } from "./components/SearchForm";
import { ResultsTable } from "./components/ResultsTable";
import { ScreenshotImport } from "./components/ScreenshotImport";
import { ManualImport } from "./components/ManualImport";
import {
  fetchDetails,
  generateSite,
  phaseCostUSD,
  researchBusiness,
  searchBusinesses,
  type SearchResponse,
} from "./lib/api";
import type {
  BusinessBasic,
  BusinessDetails,
  DesignModelId,
  GeneratedSite,
  JobStatus,
  SearchFilters,
} from "./types";

const LS_MODEL_KEY = "sitepilot.designModel.v1";
const LS_RESEARCH_MODEL_KEY = "sitepilot.researchModel.v1";

// No default — user must explicitly pick both models before Generate is enabled.
// If a previous selection is in localStorage we surface it (convenience), but
// a fresh user sees empty dropdowns.
function loadModel(): DesignModelId | undefined {
  if (typeof window === "undefined") return undefined;
  const saved = window.localStorage.getItem(LS_MODEL_KEY);
  return saved ? (saved as DesignModelId) : undefined;
}

function loadResearchModel(): DesignModelId | undefined {
  if (typeof window === "undefined") return undefined;
  const saved = window.localStorage.getItem(LS_RESEARCH_MODEL_KEY);
  return saved ? (saved as DesignModelId) : undefined;
}

export default function App() {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BusinessBasic[]>([]);
  // undefined = probe in flight, true = backend is in demo mode (no Google
  // key), false = backend has the key. Banners render only when known —
  // avoids the demo-mode flash that an optimistic default would cause on
  // every page load.
  const [demoMode, setDemoMode] = useState<boolean | undefined>(undefined);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchRev, setSearchRev] = useState(0); // bumps on each successful search -> triggers flash
  const [totalFound, setTotalFound] = useState<number | undefined>();

  const [designModel, setDesignModelState] = useState<DesignModelId | undefined>(loadModel);
  function setDesignModel(id: DesignModelId | undefined) {
    setDesignModelState(id);
    try {
      if (id) window.localStorage.setItem(LS_MODEL_KEY, id);
      else window.localStorage.removeItem(LS_MODEL_KEY);
    } catch {}
  }

  const [researchModel, setResearchModelState] = useState<DesignModelId | undefined>(
    loadResearchModel,
  );
  function setResearchModel(id: DesignModelId | undefined) {
    setResearchModelState(id);
    try {
      if (id) window.localStorage.setItem(LS_RESEARCH_MODEL_KEY, id);
      else window.localStorage.removeItem(LS_RESEARCH_MODEL_KEY);
    } catch {}
  }

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | undefined>();
  const [researchingId, setResearchingId] = useState<string | undefined>();
  const [generationStatus, setGenerationStatus] = useState<JobStatus | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);
  const [lastFilters, setLastFilters] = useState<SearchFilters | null>(() => {
    try {
      const raw = window.localStorage.getItem(LS_LAST_FILTERS_KEY);
      return raw ? (JSON.parse(raw) as SearchFilters) : null;
    } catch {
      return null;
    }
  });

  // Per-row caches. All three are persisted to localStorage so research +
  // generated sites survive a page refresh — the user pays once per row,
  // they get to keep the result.
  //
  //   dossierByPlaceId:  research output, drives the dossier panel + unlocks
  //                      the Generate site button for that row.
  //   siteByPlaceId:     generated HTML + provider/model/SEO, drives the
  //                      inline site preview panel under each row.
  //   businessByPlaceId: enriched BusinessDetails (reviews, hours, photo
  //                      refs, lead score) needed by the SitePreview.
  const LS_DOSSIER_KEY = "sitepilot.cache.dossier.v1";
  const LS_SITE_KEY = "sitepilot.cache.site.v1";
  const LS_BUSINESS_KEY = "sitepilot.cache.business.v1";
  const LS_SEARCH_KEY = "sitepilot.cache.search.v1";
  // Last filter set the operator searched. Persisting just this lets us
  // restore the displayed results from the search cache on page reload —
  // the searchCacheByKey already has the SearchResponse, we just need to
  // know which one to pluck out and display.
  const LS_LAST_FILTERS_KEY = "sitepilot.last.filters.v1";

  function loadMap<V>(key: string): Map<string, V> {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw) as Array<[string, V]>;
      return new Map(parsed);
    } catch {
      return new Map();
    }
  }

  const [dossierByPlaceId, setDossierByPlaceId] = useState<Map<string, unknown>>(() =>
    loadMap<unknown>(LS_DOSSIER_KEY),
  );
  const [siteByPlaceId, setSiteByPlaceId] = useState<Map<string, GeneratedSite>>(() =>
    loadMap<GeneratedSite>(LS_SITE_KEY),
  );
  const [businessByPlaceId, setBusinessByPlaceId] = useState<Map<string, BusinessDetails>>(
    () => loadMap<BusinessDetails>(LS_BUSINESS_KEY),
  );
  // Cache of full search responses keyed by JSON.stringify(filters). Lets the
  // app re-show prior searches without burning Places API calls. The
  // operator can force a fresh fetch via the Refresh button in the
  // results header (covered below).
  const [searchCacheByKey, setSearchCacheByKey] = useState<Map<string, SearchResponse>>(
    () => loadMap<SearchResponse>(LS_SEARCH_KEY),
  );
  // True when the currently-displayed results came out of searchCacheByKey
  // rather than a fresh /search-businesses call. Drives the "(cached)" pill
  // + Refresh button in the main pane header.
  const [lastWasCached, setLastWasCached] = useState(false);

  // Mirror each cache to localStorage on every update.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        LS_DOSSIER_KEY,
        JSON.stringify(Array.from(dossierByPlaceId.entries())),
      );
    } catch {}
  }, [dossierByPlaceId]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        LS_SITE_KEY,
        JSON.stringify(Array.from(siteByPlaceId.entries())),
      );
    } catch {}
  }, [siteByPlaceId]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        LS_BUSINESS_KEY,
        JSON.stringify(Array.from(businessByPlaceId.entries())),
      );
    } catch {}
  }, [businessByPlaceId]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        LS_SEARCH_KEY,
        JSON.stringify(Array.from(searchCacheByKey.entries())),
      );
    } catch {}
  }, [searchCacheByKey]);
  useEffect(() => {
    try {
      if (lastFilters) {
        window.localStorage.setItem(LS_LAST_FILTERS_KEY, JSON.stringify(lastFilters));
      } else {
        window.localStorage.removeItem(LS_LAST_FILTERS_KEY);
      }
    } catch {}
  }, [lastFilters]);

  function searchCacheKey(filters: SearchFilters): string {
    return JSON.stringify(filters);
  }

  // On mount: hydrate the visible results from the search cache so the
  // operator sees their last search immediately on reload — no Google
  // Places call, no second click.
  //
  //  - Preferred: lookup by the persisted lastFilters.
  //  - Fallback (covers searches cached BEFORE lastFilters persistence
  //    landed, or any case where the key was lost): take the most
  //    recently added entry from searchCacheByKey. Map iteration order
  //    is insertion order, so the last entry is the most recent search.
  //    Re-derive filters from the cache key so the header / Refresh
  //    button work correctly.
  useEffect(() => {
    let cached: SearchResponse | undefined;
    let derivedFilters: SearchFilters | null = null;

    if (lastFilters) {
      cached = searchCacheByKey.get(searchCacheKey(lastFilters));
    }
    if (!cached && searchCacheByKey.size > 0) {
      const entries = Array.from(searchCacheByKey.entries());
      const [lastKey, lastVal] = entries[entries.length - 1];
      cached = lastVal;
      try {
        derivedFilters = JSON.parse(lastKey) as SearchFilters;
      } catch {
        // Malformed key — nothing to do, header just won't display the sector/location.
      }
    }
    if (!cached) return;
    setResults(cached.businesses);
    setDemoMode(cached.demo);
    setDemoNote(cached.note ?? null);
    setTotalFound(cached.totalFound);
    setLastWasCached(true);
    setSearchRev((n) => n + 1);
    if (derivedFilters && !lastFilters) setLastFilters(derivedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary of the most recent successful Research click — surfaced as a
  // banner in the main pane so the user can see at a glance what came back
  // (model the API actually served, sources count, cost) without opening F12.
  interface ResearchSummary {
    placeId: string;
    businessName: string;
    requestedModel: DesignModelId;
    servedModel: string;
    sources: number;
    costUSD: number;
    elapsedMs: number;
  }
  const [lastResearch, setLastResearch] = useState<ResearchSummary | null>(null);

  // Probe the backend once on mount to know whether we're in demo mode.
  // Uses the dedicated `probe: true` short-circuit — no Places API calls.
  useEffect(() => {
    fetch("/.netlify/functions/search-businesses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ probe: true }),
    })
      .then((r) => r.json())
      .then((r: { demo?: boolean }) => setDemoMode(Boolean(r.demo)))
      .catch(() => {});
  }, []);

  async function runSearch(filters: SearchFilters, opts: { bypassCache?: boolean } = {}) {
    setError(null);
    setSearching(true);
    setSelectedId(undefined);
    setLastFilters(filters);

    const key = searchCacheKey(filters);
    const cached = opts.bypassCache ? undefined : searchCacheByKey.get(key);
    if (cached) {
      console.log("%c[search cached] HIT —", "color: #fa5; font-weight: bold;", filters, {
        matches: cached.businesses.length,
        totalFound: cached.totalFound,
      });
      setResults(cached.businesses);
      setDemoMode(cached.demo);
      setDemoNote(cached.note ?? null);
      setTotalFound(cached.totalFound);
      setSearchRev((n) => n + 1);
      setLastWasCached(true);
      setSearching(false);
      return;
    }

    try {
      const r = await searchBusinesses(filters);
      setResults(r.businesses);
      setDemoMode(r.demo);
      setDemoNote(r.note ?? null);
      setTotalFound(r.totalFound);
      setSearchRev((n) => n + 1);
      setLastWasCached(false);
      // Persist for next time (only when the call really hit Google — demo
      // responses still get cached but they're cheap, no harm).
      setSearchCacheByKey((prev) => {
        const next = new Map(prev);
        next.set(key, r);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function refreshFromGoogle() {
    if (!lastFilters) return;
    runSearch(lastFilters, { bypassCache: true });
  }

  async function runResearch(b: BusinessBasic) {
    if (!researchModel) {
      setError("Pick a research model from the sidebar (section 2).");
      return;
    }
    setResearchingId(b.place_id);
    setError(null);
    try {
      // Enrich with place-details first so research has reviews / hours / etc.
      const { business } = await fetchDetails(b.place_id, b);
      // Cache the enriched BusinessDetails immediately. Generate site can
      // then skip its own /place-details call ($0.017 saved per row).
      setBusinessByPlaceId((prev) => {
        const next = new Map(prev);
        next.set(b.place_id, business);
        return next;
      });
      const r = await researchBusiness(business, researchModel);
      // Cache the dossier so Generate site can skip its own research call.
      setDossierByPlaceId((prev) => {
        const next = new Map(prev);
        next.set(b.place_id, r.dossier);
        return next;
      });
      const sources = (r.dossier as { sources?: unknown[] } | null)?.sources?.length ?? 0;
      const costUSD = phaseCostUSD(
        researchModel,
        r.usage?.input_tokens,
        r.usage?.output_tokens,
        true,
      );
      setLastResearch({
        placeId: b.place_id,
        businessName: b.name,
        requestedModel: researchModel,
        servedModel: r.model,
        sources,
        costUSD,
        elapsedMs: r.elapsedMs,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResearchingId(undefined);
    }
  }

  async function buildSite(b: BusinessBasic) {
    if (!designModel) {
      setError("Pick a design model from the sidebar (section 3).");
      return;
    }
    const cachedDossier = dossierByPlaceId.get(b.place_id);
    if (!cachedDossier) {
      setError(
        `No dossier for "${b.name}". Click Research on this row first — site generation uses the dossier from that step.`,
      );
      return;
    }
    setBusyId(b.place_id);
    setError(null);
    setGenerationStatus("pending");
    setGenerationElapsed(0);
    const t0 = Date.now();
    const tick = window.setInterval(() => {
      setGenerationElapsed(Math.round((Date.now() - t0) / 1000));
    }, 500);
    try {
      // Reuse the BusinessDetails cached by the prior Research click. Falls
      // back to a fresh /place-details call only if (somehow) we have a
      // dossier but no cached business — that shouldn't happen in normal
      // flow but covers the edge case where the business cache was wiped.
      const cachedBusiness = businessByPlaceId.get(b.place_id);
      const business = cachedBusiness ?? (await fetchDetails(b.place_id, b)).business;
      const { record } = await generateSite(
        business,
        designModel,
        researchModel, // still recorded, but research call is skipped server-side
        (rec) => {
          setGenerationStatus(rec.status);
        },
        { dossier: cachedDossier },
      );
      if (record.status === "error") {
        throw new Error(record.error || "Generation failed");
      }
      if (!record.site) throw new Error("Generation finished with no site payload");
      // Stash both the site and the enriched business into per-row caches —
      // SitePreview needs both. Replaces any earlier cached pair for this row.
      const generated = record.site;
      setSiteByPlaceId((prev) => {
        const next = new Map(prev);
        next.set(b.place_id, generated);
        return next;
      });
      setBusinessByPlaceId((prev) => {
        const next = new Map(prev);
        next.set(b.place_id, business);
        return next;
      });
      setSelectedId(b.place_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      window.clearInterval(tick);
      setBusyId(undefined);
      setGenerationStatus(null);
    }
  }

  // Persist a manually-generated site (pasted from claude.ai web) into the
  // same per-row caches an API run would have populated. The site keeps a
  // generated_by="manual" marker so SitePreview can label it accordingly.
  function saveManualSite(placeId: string, site: GeneratedSite) {
    setSiteByPlaceId((prev) => {
      const next = new Map(prev);
      next.set(placeId, site);
      return next;
    });
    setSelectedId(placeId);
  }

  // Shared by ScreenshotImport and ManualImport — merge a freshly resolved
  // batch into the visible results, dedupe by place_id, and seed lastFilters
  // so the main-pane header has something sensible to show.
  function mergeImported(businesses: BusinessBasic[], names: string[]) {
    setError(null);
    if (businesses.length === 0) return;
    setResults((prev) => {
      const byId = new Map<string, BusinessBasic>();
      for (const b of prev) byId.set(b.place_id, b);
      for (const b of businesses) byId.set(b.place_id, b);
      return Array.from(byId.values());
    });
    setLastFilters(
      (prev) =>
        prev ?? {
          sector: "restaurants_tavernas",
          location: `imported: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`,
          noWebsiteOnly: false,
          minRating: 0,
          minReviews: 0,
          maxResults: 60,
        },
    );
    setSearchRev((n) => n + 1);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-final.png" alt="SitePilot" className="brand-img" />
          <small>Mock Site Generator</small>
        </div>

        {demoMode && (
          <div
            className="banner warn"
            style={{ marginBottom: 14, fontSize: 12 }}
          >
            <strong>Demo mode.</strong>
            <span>
              No Google API key. Location is ignored — only sample businesses are returned.
            </span>
          </div>
        )}

        <SearchForm
          onSearch={runSearch}
          loading={searching}
          demoMode={demoMode}
          designModel={designModel}
          onDesignModelChange={setDesignModel}
          researchModel={researchModel}
          onResearchModelChange={setResearchModel}
        />

        {demoMode === false && (
          <>
            <div className="filter-card" style={{ marginTop: 14 }}>
              <h3>Or paste names manually</h3>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: -4,
                  marginBottom: 12,
                }}
              >
                One business name per line. Each fires a single Google Places
                Text Search call (~$0.032/name) — much cheaper than a sector
                search when you already know what you want.
              </div>
              <ManualImport
                locationHint={lastFilters?.location}
                onImported={mergeImported}
                onError={(msg) => setError(msg)}
              />
            </div>

            <div className="filter-card" style={{ marginTop: 14 }}>
              <h3>Or drop a Google Maps screenshot</h3>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: -4,
                  marginBottom: 12,
                }}
              >
                Gemini extracts visible business names → each is resolved via
                Google Places. Useful when you've already screenshotted a list.
              </div>
              <ScreenshotImport
                locationHint={lastFilters?.location}
                onImported={mergeImported}
                onError={(msg) => setError(msg)}
              />
            </div>
          </>
        )}

        <div style={{ marginTop: 20, fontSize: 12, color: "var(--text-muted)" }}>
          Tip: Spec rules are loaded from <code>SPEC.md</code> and applied by the
          generator automatically.
        </div>
      </aside>

      <main className="main">
        <div className="main-header">
          <h2>
            {lastFilters
              ? `Results — ${lastFilters.sector} in ${lastFilters.location}`
              : "Search for businesses to begin"}
          </h2>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {results.length > 0 && <span>{results.length} matches</span>}
            {lastWasCached && results.length > 0 && (
              <>
                <span
                  title="Served from your local search cache — no Google Places calls were made for this view."
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 999,
                    padding: "1px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  cached
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={refreshFromGoogle}
                  title="Re-run this search against Google Places (paid)"
                >
                  Refresh from Google
                </button>
              </>
            )}
          </div>
        </div>

        {demoMode && results.length > 0 && (
          <div className="banner warn">
            <strong>Demo mode.</strong>
            <span>
              {demoNote ||
                "These are sample businesses — location filtering requires a Google API key."}
            </span>
          </div>
        )}

        {error && (
          <div className="banner error">
            <strong>Error:</strong> <span>{error}</span>
          </div>
        )}

        {(() => {
          // Cumulative manual-generation footprint, derived from siteByPlaceId.
          // Persists with the cache, so the number includes every manual site
          // ever saved in this browser (until the operator clears storage).
          const manualSites = Array.from(siteByPlaceId.values()).filter(
            (s) => s.generated_by === "manual",
          );
          if (manualSites.length === 0) return null;
          const inTok = manualSites.reduce(
            (a, s) => a + (s.input_tokens_estimate ?? 0),
            0,
          );
          const outTok = manualSites.reduce(
            (a, s) => a + (s.output_tokens_estimate ?? 0),
            0,
          );
          const totalTok = inTok + outTok;
          const equivCost = manualSites.reduce(
            (a, s) => a + (s.api_equivalent_cost_usd ?? 0),
            0,
          );
          // Rough heuristic for "how close are you to a Claude Max limit?"
          // Anthropic doesn't publish hard numbers; community estimates put
          // Max $200 at roughly 50 heavy Opus messages per 5-hour window
          // (~5M tokens of throughput is a generous upper bound). We label
          // the % as "approx." everywhere it's shown.
          const ROUGH_5H_WINDOW = 5_000_000;
          const pctOfWindow = (totalTok / ROUGH_5H_WINDOW) * 100;
          return (
            <div
              className="banner"
              style={{
                marginBottom: 14,
                fontSize: 12,
                borderLeft: "3px solid var(--accent)",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
              title="Cumulative manual-generation footprint across every site cached in this browser. claude.ai web is flat-rate so actual marginal cost is $0 — the dollar figure is what these generations would have billed via the Opus 4.7 API."
            >
              <strong style={{ color: "var(--accent)" }}>
                Manual usage · claude.ai Max
              </strong>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span>
                {manualSites.length} site{manualSites.length === 1 ? "" : "s"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span>
                ~{totalTok.toLocaleString("en-US")} tokens
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  ({inTok.toLocaleString("en-US")} in / {outTok.toLocaleString("en-US")} out)
                </span>
              </span>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <span>
                ~${equivCost.toFixed(4)}{" "}
                <span style={{ color: "var(--text-muted)" }}>
                  equivalent if API · actual $0
                </span>
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: 11 }}>
                ≈{pctOfWindow.toFixed(2)}% of a rough 5h Max window
              </span>
            </div>
          );
        })()}

        {lastResearch && (
          <div
            className="banner"
            style={{
              marginBottom: 14,
              fontSize: 12,
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <strong style={{ color: "var(--accent)" }}>Research done</strong>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span style={{ fontWeight: 600 }}>{lastResearch.businessName}</span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span>
              served by <code>{lastResearch.servedModel}</code>
            </span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span>
              {lastResearch.sources} source{lastResearch.sources === 1 ? "" : "s"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span>${lastResearch.costUSD.toFixed(4)}</span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span>{(lastResearch.elapsedMs / 1000).toFixed(1)}s</span>
            <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
              Click <strong>Generate site</strong> on this row to use the dossier.
            </span>
          </div>
        )}

        {results.length === 0 && !searching && !error && !lastFilters && (
          <div className="empty-state">
            <h3>No results yet</h3>
            <p>
              Pick a sector and location on the left, then press
              <strong> Search businesses</strong>.
            </p>
          </div>
        )}

        {results.length === 0 && !searching && !error && lastFilters && (
          <div className="empty-state">
            <h3>No matches</h3>
            <p>
              {typeof totalFound === "number" && totalFound > 0
                ? `Google returned ${totalFound} place${totalFound === 1 ? "" : "s"}, but your filters removed them all.`
                : "Google returned nothing for this query."}
            </p>
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
              Try lowering <strong>min reviews</strong> / <strong>min rating</strong>,
              unticking <strong>Only without a website</strong>, or broadening the location
              (e.g. <em>Sifnos</em> instead of <em>Apollonia</em>).
            </p>
            {(lastFilters.sector === "accommodations" || lastFilters.sector === "boat_rental") && (
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--warn)" }}>
                Note: {lastFilters.sector === "accommodations" ? "villas and apartments" : "boat rentals"} on Greek
                islands are often listed on Airbnb / Booking / VRBO rather than Google Places. Hotels are
                well-covered; independent rentals less so.
              </p>
            )}
          </div>
        )}

        {busyId && generationStatus && (
          <div className="banner" style={{ marginBottom: 14, fontSize: 12 }}>
            <span className="spinner" />
            <span>
              {generationStatus === "pending" && "Queueing generation…"}
              {generationStatus === "researching" && "Researching business on the web…"}
              {generationStatus === "designing" && "Designing site…"}
              {generationStatus === "done" && "Done."}
              {generationStatus === "error" && "Error."}{" "}
              <span style={{ color: "var(--text-muted)" }}>· {generationElapsed}s</span>
            </span>
          </div>
        )}

        <div key={searchRev} className="fade-in">
          <ResultsTable
            results={results}
            onSelect={buildSite}
            onResearch={runResearch}
            selectedId={selectedId}
            loadingId={busyId}
            researchingId={researchingId}
            researchedIds={dossierByPlaceId}
            siteByPlaceId={siteByPlaceId}
            businessByPlaceId={businessByPlaceId}
            onManualSiteSave={saveManualSite}
          />
        </div>
      </main>
    </div>
  );
}
