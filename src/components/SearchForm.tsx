import { useEffect, useRef, useState } from "react";
import {
  DESIGN_MODELS,
  SECTORS,
  type DesignModelId,
  type SearchDepth,
  type SearchFilters,
  type Sector,
} from "../types";
import { autocompleteLocation, type LocationSuggestion } from "../lib/api";

interface Props {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
  demoMode: boolean;
  designModel: DesignModelId;
  onDesignModelChange: (id: DesignModelId) => void;
  researchModel: DesignModelId;
  onResearchModelChange: (id: DesignModelId) => void;
}

function validateLocation(loc: string): { ok: boolean; hint?: string } {
  const v = loc.trim();
  if (v.length < 3) return { ok: false, hint: "Enter at least 3 characters" };
  if (!/[A-Za-zΑ-ω]/.test(v)) return { ok: false, hint: "Location must contain letters" };
  return { ok: true };
}

export function SearchForm({
  onSearch,
  loading,
  demoMode,
  designModel,
  onDesignModelChange,
  researchModel,
  onResearchModelChange,
}: Props) {
  const designModelHint = DESIGN_MODELS.find((m) => m.value === designModel)?.hint;
  const researchModelHint = DESIGN_MODELS.find((m) => m.value === researchModel)?.hint;
  const [sector, setSector] = useState<Sector>("restaurant");
  const [location, setLocation] = useState("Paros, Greece");
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(10);
  const [maxResults, setMaxResults] = useState(20);
  const [searchDepth, setSearchDepth] = useState<SearchDepth>("quick");

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suppressNextFetchRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const locationCheck = validateLocation(location);

  useEffect(() => {
    if (demoMode) {
      setSuggestions([]);
      return;
    }
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const input = location.trim();
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await autocompleteLocation(input);
        setSuggestions(res.suggestions);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [location, demoMode]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickSuggestion(s: LocationSuggestion) {
    suppressNextFetchRef.current = true;
    setLocation(s.description);
    setShowDropdown(false);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationCheck.ok) return;
    setShowDropdown(false);
    onSearch({
      sector,
      location: location.trim(),
      noWebsiteOnly,
      minRating,
      minReviews,
      maxResults,
      searchDepth,
    });
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <div>
        <label htmlFor="sector">Sector</label>
        <select
          id="sector"
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector)}
          style={{ width: "100%" }}
        >
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div ref={wrapperRef} style={{ position: "relative" }}>
        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Paros, Greece · Santorini · Mykonos town"
          style={{
            width: "100%",
            borderColor: locationCheck.ok ? undefined : "var(--danger)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {showDropdown && suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              listStyle: "none",
              padding: 4,
              background: "var(--bg-elev, #1a1a1a)",
              border: "1px solid var(--border, #333)",
              borderRadius: 6,
              maxHeight: 280,
              overflowY: "auto",
              zIndex: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            {suggestions.map((s, idx) => (
              <li
                key={s.placeId}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(s);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: 4,
                  background: idx === activeIndex ? "var(--bg-hover, #2a2a2a)" : "transparent",
                }}
              >
                <div style={{ fontSize: 14 }}>{s.mainText}</div>
                {s.secondaryText && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {s.secondaryText}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!locationCheck.ok && (
          <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>
            {locationCheck.hint}
          </div>
        )}
        {locationCheck.ok && demoMode && (
          <div style={{ color: "var(--warn)", fontSize: 11, marginTop: 4 }}>
            ⚠︎ Demo mode: location is not actually searched. Add{" "}
            <code>GOOGLE_MAPS_API_KEY</code> to <code>.env</code> for real results.
          </div>
        )}
        {locationCheck.ok && !demoMode && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            Google Places will be queried with “{location.trim()}”.
          </div>
        )}
      </div>

      <div className="filter-card">
        <h3>Selection rules</h3>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noWebsiteOnly}
            onChange={(e) => setNoWebsiteOnly(e.target.checked)}
          />
          Only businesses without a website
        </label>

        <div className="form-row" style={{ marginTop: 10 }}>
          <div>
            <label htmlFor="minRating">Min rating</label>
            <input
              id="minRating"
              type="number"
              step={0.1}
              min={0}
              max={5}
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label htmlFor="minReviews">Min reviews</label>
            <input
              id="minReviews"
              type="number"
              min={0}
              value={minReviews}
              onChange={(e) => setMinReviews(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label htmlFor="maxResults">Max results</label>
          <input
            id="maxResults"
            type="number"
            min={1}
            max={200}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label htmlFor="searchDepth">Search depth</label>
          <select
            id="searchDepth"
            value={searchDepth}
            onChange={(e) => setSearchDepth(e.target.value as SearchDepth)}
            style={{ width: "100%" }}
          >
            <option value="quick">Quick — 1 query, ~2s, ~10–20 results</option>
            <option value="deep">Deep — 5–9 queries paginated, ~15–25s, ~60–200 results</option>
          </select>
          {searchDepth === "deep" && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
              Broader phrasings, no primary-type filter — catches villas listed as
              <code> lodging</code>, tavernas listed as <code>restaurant</code>, etc.
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="researchModel">Research model (web-grounded dossier)</label>
        <select
          id="researchModel"
          value={researchModel}
          onChange={(e) => onResearchModelChange(e.target.value as DesignModelId)}
          style={{ width: "100%" }}
        >
          {DESIGN_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {researchModelHint && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            {researchModelHint} · OpenRouter options re-routed to direct API so
            web-search tools work.
          </div>
        )}
      </div>

      <div>
        <label htmlFor="designModel">Design model (for site generation)</label>
        <select
          id="designModel"
          value={designModel}
          onChange={(e) => onDesignModelChange(e.target.value as DesignModelId)}
          style={{ width: "100%" }}
        >
          {DESIGN_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {designModelHint && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            {designModelHint}
          </div>
        )}
      </div>

      <button type="submit" className="btn" disabled={loading || !locationCheck.ok}>
        {loading ? (
          <>
            <span className="spinner" /> Searching…
          </>
        ) : (
          "Search businesses"
        )}
      </button>
    </form>
  );
}
