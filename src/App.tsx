import { useEffect, useState } from "react";
import "./App.css";
import { SearchForm } from "./components/SearchForm";
import { ResultsTable } from "./components/ResultsTable";
import { SitePreview } from "./components/SitePreview";
import { fetchDetails, generateSite, searchBusinesses } from "./lib/api";
import type { BusinessBasic, BusinessDetails, GeneratedSite, SearchFilters } from "./types";

export default function App() {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BusinessBasic[]>([]);
  const [demoMode, setDemoMode] = useState(true); // assume demo until proven otherwise
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchRev, setSearchRev] = useState(0); // bumps on each successful search -> triggers flash
  const [totalFound, setTotalFound] = useState<number | undefined>();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | undefined>();
  const [selectedDetails, setSelectedDetails] = useState<BusinessDetails | null>(null);
  const [selectedSite, setSelectedSite] = useState<GeneratedSite | null>(null);
  const [lastFilters, setLastFilters] = useState<SearchFilters | null>(null);

  // Probe the backend once on mount to know whether we're in demo mode.
  useEffect(() => {
    fetch("/.netlify/functions/search-businesses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sector: "restaurant", location: "Paros, Greece", maxResults: 1 }),
    })
      .then((r) => r.json())
      .then((r: { demo?: boolean }) => setDemoMode(Boolean(r.demo)))
      .catch(() => {});
  }, []);

  async function runSearch(filters: SearchFilters) {
    setError(null);
    setSearching(true);
    setSelectedId(undefined);
    setSelectedDetails(null);
    setSelectedSite(null);
    setLastFilters(filters);
    try {
      const r = await searchBusinesses(filters);
      setResults(r.businesses);
      setDemoMode(r.demo);
      setDemoNote(r.note ?? null);
      setTotalFound(r.totalFound);
      setSearchRev((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function buildSite(b: BusinessBasic) {
    setBusyId(b.place_id);
    setError(null);
    try {
      const { business } = await fetchDetails(b.place_id, b);
      const { site } = await generateSite(business);
      setSelectedId(b.place_id);
      setSelectedDetails(business);
      setSelectedSite(site);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="SitePilot" className="brand-img" />
          <small>Lead finder · mock site generator</small>
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

        <SearchForm onSearch={runSearch} loading={searching} demoMode={demoMode} />

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
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {results.length > 0 && `${results.length} matches`}
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
            {(lastFilters.sector === "villa" || lastFilters.sector === "boat_rental") && (
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--warn)" }}>
                Note: {lastFilters.sector === "villa" ? "villas" : "boat rentals"} on Greek islands are
                mostly listed on Airbnb / Booking / VRBO, not Google Places. Coverage is limited.
              </p>
            )}
          </div>
        )}

        <div key={searchRev} className="fade-in">
          <ResultsTable
            results={results}
            onSelect={buildSite}
            selectedId={selectedId}
            loadingId={busyId}
          />
        </div>

        {selectedDetails && selectedSite && (
          <SitePreview business={selectedDetails} site={selectedSite} />
        )}
      </main>
    </div>
  );
}
