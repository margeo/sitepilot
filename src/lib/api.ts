import type {
  BusinessBasic,
  BusinessDetails,
  DesignModelId,
  GeneratedSite,
  JobRecord,
  SearchFilters,
} from "../types";

const BASE = "/.netlify/functions";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export interface SearchResponse {
  businesses: BusinessBasic[];
  demo: boolean;
  note?: string;
  totalFound?: number;
}

export function searchBusinesses(filters: SearchFilters): Promise<SearchResponse> {
  return post<SearchResponse>("search-businesses", filters);
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
