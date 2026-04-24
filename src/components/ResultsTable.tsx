import type { BusinessBasic } from "../types";

interface Props {
  results: BusinessBasic[];
  onSelect: (b: BusinessBasic) => void;
  selectedId?: string;
  loadingId?: string;
}

export function ResultsTable({ results, onSelect, selectedId, loadingId }: Props) {
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
        const isLoading = loadingId === b.place_id;
        return (
          <div
            key={b.place_id}
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
            <div>
              <button
                className="btn btn-sm"
                disabled={isLoading}
                onClick={() => onSelect(b)}
              >
                {isLoading ? (
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
        );
      })}
    </div>
  );
}
