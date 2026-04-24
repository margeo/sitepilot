import type { BusinessBasic, BusinessDetails, GeneratedSite, SearchFilters } from "../types";

const BASE = "/.netlify/functions";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
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

export interface GenerateResponse {
  site: GeneratedSite;
  demo: boolean;
}

export function generateSite(business: BusinessDetails): Promise<GenerateResponse> {
  return post<GenerateResponse>("generate-site", { business });
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
