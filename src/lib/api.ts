import {
  MODEL_RATES,
  PLACES_TEXT_SEARCH_USD_PER_CALL,
  type BusinessBasic,
  type BusinessDetails,
  type DesignModelId,
  type GeneratedSite,
  type JobRecord,
  type SearchFilters,
} from "../types";

function fmtUSD(n: number): string {
  return "$" + n.toFixed(4);
}

function fmtTokens(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("en-US");
}

// Compute per-phase cost (tokens × rate + per-call search surcharge).
function phaseCostUSD(modelId: DesignModelId | undefined, inTok = 0, outTok = 0, isResearch = false): number {
  if (!modelId) return 0;
  const rates = MODEL_RATES[modelId];
  if (!rates) return 0;
  const tokenCost = (inTok * rates.inPer1M + outTok * rates.outPer1M) / 1_000_000;
  return tokenCost + (isResearch ? rates.researchSearchUSD : 0);
}

const BASE = "/.netlify/functions";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok && res.status !== 202) {
    throw new Error(`${path} failed (${res.status}): ${text || "(empty body)"}`);
  }
  if (!text) {
    throw new Error(`${path} returned empty body (status ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${path} returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`,
    );
  }
}

export interface SearchResponse {
  businesses: BusinessBasic[];
  demo: boolean;
  note?: string;
  totalFound?: number;
  _debug?: {
    perQuery?: Array<{
      query: string;
      returned: number;
      apiCalls: number;
      uniqueAdded: number;
      newNames: string[];
    }>;
    totalApiCalls?: number;
    queryCount?: number;
    totalRaw?: number;
    afterTypeWhitelist?: number;
    afterLocationFilter?: number;
    afterFinalFilters?: number;
    errorCount?: number;
    errors?: Array<{ query: string; page: number; status: number; message: string }>;
  };
}

export interface SearchLogContext {
  researchModelId?: DesignModelId;
  designModelId?: DesignModelId;
}

function modelLabelForLog(id: DesignModelId | undefined, kind: "research" | "design"): string {
  if (!id) return "(none selected)";
  const rates = MODEL_RATES[id];
  if (!rates) return id;
  // Estimate per-call cost the same way generate-site does, but with
  // representative token counts so the user sees ballpark before running.
  // Research: ~5k in / ~2k out + search surcharge.
  // Design: ~8k in / ~6k out, no search surcharge.
  if (kind === "research") {
    const est = (5000 * rates.inPer1M + 2000 * rates.outPer1M) / 1_000_000 + rates.researchSearchUSD;
    return `${id} (~${fmtUSD(est)}/dossier)`;
  }
  const est = (8000 * rates.inPer1M + 6000 * rates.outPer1M) / 1_000_000;
  return `${id} (~${fmtUSD(est)}/site)`;
}

export async function searchBusinesses(
  filters: SearchFilters,
  ctx: SearchLogContext = {},
): Promise<SearchResponse> {
  const t0 = performance.now();
  console.log("[search] →", filters);
  const res = await post<SearchResponse>("search-businesses", filters);
  const elapsedMs = performance.now() - t0;

  const dbg = res._debug ?? {};
  const apiCalls = dbg.totalApiCalls ?? 0;
  const placesCostUSD = apiCalls * PLACES_TEXT_SEARCH_USD_PER_CALL;

  console.groupCollapsed(
    `%c[search] DONE — ${filters.sector} in ${filters.location} — ${res.businesses.length} matches — ${fmtUSD(placesCostUSD)} — ${(elapsedMs / 1000).toFixed(1)}s`,
    "color: #5fa; font-weight: bold;",
  );

  console.table({
    sector: { value: filters.sector },
    location: { value: filters.location },
    queries_fired: { value: dbg.queryCount ?? "—" },
    api_calls: { value: apiCalls },
    places_cost_USD: { value: fmtUSD(placesCostUSD) },
    elapsed_s: { value: (elapsedMs / 1000).toFixed(1) },
  });

  console.log("Funnel:");
  console.table({
    "raw (deduped)": { count: dbg.totalRaw ?? "—" },
    "after type whitelist": { count: dbg.afterTypeWhitelist ?? "—" },
    "after location filter": { count: dbg.afterLocationFilter ?? "—" },
    "after final filters (rating/reviews/website/maxResults)": {
      count: dbg.afterFinalFilters ?? "—",
    },
  });

  console.log(
    "%cSelected models for next phase (Generate Site):",
    "color: #fa5; font-weight: bold;",
  );
  console.table({
    "Research model": { id_and_estimate: modelLabelForLog(ctx.researchModelId, "research") },
    "Design model": { id_and_estimate: modelLabelForLog(ctx.designModelId, "design") },
  });

  if (dbg.perQuery && dbg.perQuery.length > 0) {
    console.groupCollapsed(`Per-query breakdown (${dbg.perQuery.length})`);
    console.table(
      Object.fromEntries(
        dbg.perQuery.map((q) => [
          q.query,
          {
            api_calls: q.apiCalls,
            returned: q.returned,
            unique_added: q.uniqueAdded,
            new_names_sample: q.newNames.slice(0, 3).join(", ") + (q.newNames.length > 3 ? "…" : ""),
          },
        ]),
      ),
    );
    console.groupEnd();
  }

  if (dbg.errorCount && dbg.errorCount > 0) {
    console.warn(`Places API errors: ${dbg.errorCount}`, dbg.errors);
  }

  console.log("Raw response:", res);
  console.groupEnd();

  // Save full result + context for ad-hoc inspection later (window._lastSearch).
  (
    window as unknown as { _lastSearch?: { filters: SearchFilters; response: SearchResponse; elapsedMs: number; ctx: SearchLogContext; placesCostUSD: number } }
  )._lastSearch = { filters, response: res, elapsedMs, ctx, placesCostUSD };

  return res;
}

export interface DetailsResponse {
  business: BusinessDetails;
  demo: boolean;
}

export function fetchDetails(place_id: string, basic: BusinessBasic): Promise<DetailsResponse> {
  return post<DetailsResponse>("place-details", { place_id, basic });
}

export interface StartGenerateResponse {
  jobId: string;
  status: "pending";
  modelId: DesignModelId;
  researchModelId: DesignModelId;
}

export function startGenerate(
  business: BusinessDetails,
  modelId: DesignModelId,
  researchModelId: DesignModelId,
): Promise<StartGenerateResponse> {
  return post<StartGenerateResponse>("generate-site", { business, modelId, researchModelId });
}

export async function getJobStatus(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${BASE}/generate-status?id=${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generate-status failed (${res.status}): ${text}`);
  }
  return (await res.json()) as JobRecord;
}

// Start generation and poll until done (or error / timeout).
// onTick is called on every poll with the current record.
export async function generateSite(
  business: BusinessDetails,
  modelId: DesignModelId,
  researchModelId: DesignModelId,
  onTick?: (rec: JobRecord) => void,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{ jobId: string; record: JobRecord }> {
  const interval = opts.intervalMs ?? 2000;
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000; // 5 min
  const { jobId } = await startGenerate(business, modelId, researchModelId);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));
    const record = await getJobStatus(jobId);
    onTick?.(record);
    if (record.status === "done" || record.status === "error") {
      if (record.status === "done") {
        const r = record.usage?.research;
        const d = record.usage?.design;
        const researchCost = phaseCostUSD(record.researchModelId, r?.input_tokens, r?.output_tokens, true);
        const designCost = phaseCostUSD(record.modelId, d?.input_tokens, d?.output_tokens, false);
        const totalCost = researchCost + designCost;
        const totalTokens =
          (r?.input_tokens ?? 0) + (r?.output_tokens ?? 0) +
          (d?.input_tokens ?? 0) + (d?.output_tokens ?? 0);

        console.groupCollapsed(
          `%c[generate] DONE — ${record.businessName} — ${fmtUSD(totalCost)} total — ${Math.round((record.elapsedMs?.total ?? 0) / 1000)}s`,
          "color: #5fa; font-weight: bold;",
        );
        console.table({
          "Research model": {
            model: record.researchModelId ?? "(none)",
            in_tokens: fmtTokens(r?.input_tokens),
            out_tokens: fmtTokens(r?.output_tokens),
            cost_USD: fmtUSD(researchCost),
            elapsed_s: ((record.elapsedMs?.research ?? 0) / 1000).toFixed(1),
          },
          "Design model": {
            model: record.modelId ?? "(none)",
            in_tokens: fmtTokens(d?.input_tokens),
            out_tokens: fmtTokens(d?.output_tokens),
            cost_USD: fmtUSD(designCost),
            elapsed_s: ((record.elapsedMs?.design ?? 0) / 1000).toFixed(1),
          },
          TOTAL: {
            model: "—",
            in_tokens: "—",
            out_tokens: "—",
            cost_USD: fmtUSD(totalCost),
            elapsed_s: ((record.elapsedMs?.total ?? 0) / 1000).toFixed(1),
          },
        });
        console.log("Total tokens (in+out):", totalTokens.toLocaleString("en-US"));
        console.log("Raw record:", record);
        console.groupEnd();
        // Also save to window for ad-hoc inspection later
        (window as unknown as { _lastGenerate?: JobRecord })._lastGenerate = record;
      }
      return { jobId, record };
    }
  }
  throw new Error(`Generation timed out after ${Math.round(timeout / 1000)}s`);
}

export function photoUrl(ref: string, maxwidth = 1200): string {
  return `${BASE}/photos?reference=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
}

export interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export function autocompleteLocation(input: string): Promise<{ suggestions: LocationSuggestion[] }> {
  return post<{ suggestions: LocationSuggestion[] }>("autocomplete-location", { input });
}

export interface ExtractListingsResponse {
  businesses: BusinessBasic[];
  extractedNames: string[];
  note?: string;
}

export function extractListings(
  imageDataUrl: string,
  locationHint?: string,
): Promise<ExtractListingsResponse> {
  return post<ExtractListingsResponse>("extract-listings", {
    image: imageDataUrl,
    locationHint,
  });
}
