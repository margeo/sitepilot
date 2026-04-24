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
          <div className="brand-logo">S</div>
          <div>
            <h1>SitePilot</h1>
            <small>Lead finder · mock site generator</small>
          </div>
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

        {results.length === 0 && !searching && !error && (
          <div className="empty-state">
            <h3>No results yet</h3>
            <p>
              Pick a sector and location on the left, then press
              <strong> Search businesses</strong>.
            </p>
          </div>
        )}

        {results.length === 0 && !searching && error && (
          <div className="empty-state">
            <h3>No results</h3>
            <p>Try a different sector, location, or lower the rating / review filters.</p>
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
