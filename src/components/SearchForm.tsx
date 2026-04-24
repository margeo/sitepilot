import { useState } from "react";
import { SECTORS, type SearchFilters, type Sector } from "../types";

interface Props {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
  demoMode: boolean;
}

function validateLocation(loc: string): { ok: boolean; hint?: string } {
  const v = loc.trim();
  if (v.length < 3) return { ok: false, hint: "Enter at least 3 characters" };
  if (!/[A-Za-zΑ-ω]/.test(v)) return { ok: false, hint: "Location must contain letters" };
  return { ok: true };
}

export function SearchForm({ onSearch, loading, demoMode }: Props) {
  const [sector, setSector] = useState<Sector>("restaurant");
  const [location, setLocation] = useState("Paros, Greece");
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(10);
  const [maxResults, setMaxResults] = useState(20);

  const locationCheck = validateLocation(location);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationCheck.ok) return;
    onSearch({ sector, location: location.trim(), noWebsiteOnly, minRating, minReviews, maxResults });
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

      <div>
        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Paros, Greece · Santorini · Mykonos town"
          style={{
            width: "100%",
            borderColor: locationCheck.ok ? undefined : "var(--danger)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
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
            max={60}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
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
