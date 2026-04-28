export type Sector =
  | "restaurants_tavernas"
  | "cafes_bars_pubs"
  | "bakeries"
  | "accommodations"
  | "boutique"
  | "car_rental"
  | "boat_rental"
  | "beauty_wellness"
  | "local_services";

export interface SectorOption {
  value: Sector;
  label: string;
  googleType: string;
  keyword?: string;
}

export const SECTORS: SectorOption[] = [
  { value: "restaurants_tavernas", label: "Restaurants & Tavernas", googleType: "restaurant" },
  { value: "cafes_bars_pubs", label: "Cafes, Bars & Pubs (incl. beach bars)", googleType: "cafe" },
  { value: "bakeries", label: "Bakeries & Patisseries", googleType: "bakery" },
  { value: "accommodations", label: "Accommodations (hotels, villas, apartments)", googleType: "lodging" },
  { value: "boutique", label: "Boutiques", googleType: "clothing_store", keyword: "boutique" },
  { value: "car_rental", label: "Car rentals", googleType: "car_rental" },
  { value: "boat_rental", label: "Boat rentals", googleType: "point_of_interest", keyword: "boat rental" },
  { value: "beauty_wellness", label: "Beauty / wellness", googleType: "beauty_salon" },
  { value: "local_services", label: "Local services", googleType: "point_of_interest", keyword: "local service" },
];

export interface SearchFilters {
  sector: Sector;
  location: string;
  noWebsiteOnly: boolean;
  minRating: number;
  minReviews: number;
  maxResults: number;
}

export interface BusinessBasic {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  has_website: boolean;
  website_uri?: string;
}

export interface PhoneNumbers {
  mobiles: string[];
  landlines: string[];
  display: string[];
}

export interface BusinessDetails extends BusinessBasic {
  phones: PhoneNumbers;
  formatted_address?: string;
  international_phone_number?: string;
  national_phone_number?: string;
  opening_hours?: string[];
  current_status?: string;
  google_maps_uri?: string;
  photo_refs: string[];
  reviews: Array<{
    author?: string;
    rating?: number;
    text?: string;
    relative_time?: string;
  }>;
  primary_type?: string;
  primary_type_display?: string;
  editorial_summary?: string;
  lead_score: number;
  lead_score_reasons: string[];
}

export interface GeneratedSite {
  html: string;
  seo_keywords: string[];
  suggested_pages?: string[];
  generated_by: string;
  provider?: string;
  model?: string;
}

// Design-model dropdown values. Backend validates against an allow-list
// in generate-site.ts, so keep these in sync.
export type DesignModelId =
  | "openrouter:google/gemini-3.1-flash-lite-preview"
  | "openrouter:google/gemini-3.1-pro-preview"
  | "openrouter:anthropic/claude-haiku-4.5"
  | "openrouter:anthropic/claude-sonnet-4.6"
  | "openrouter:anthropic/claude-opus-4.7"
  | "anthropic:claude-haiku-4-5"
  | "anthropic:claude-sonnet-4-6"
  | "anthropic:claude-opus-4-7";

export interface DesignModelOption {
  value: DesignModelId;
  label: string;
  hint: string; // shown under the select
}

export const DESIGN_MODELS: DesignModelOption[] = [
  {
    value: "openrouter:google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite · OpenRouter — ~$0.06/site",
    hint: "Fastest, cheapest design model.",
  },
  {
    value: "openrouter:google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro · OpenRouter — ~$0.47/site",
    hint: "Mid-tier quality.",
  },
  {
    value: "openrouter:anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5 · OpenRouter — ~$0.20/site",
    hint: "Cheap Claude.",
  },
  {
    value: "openrouter:anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6 · OpenRouter — ~$0.60/site",
    hint: "High quality.",
  },
  {
    value: "openrouter:anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7 · OpenRouter — ~$1.00/site",
    hint: "Top quality.",
  },
  {
    value: "anthropic:claude-haiku-4-5",
    label: "Claude Haiku 4.5 · Anthropic direct — ~$0.20/site",
    hint: "Cheap Claude, direct API.",
  },
  {
    value: "anthropic:claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 · Anthropic direct — ~$0.60/site",
    hint: "High quality, direct API.",
  },
  {
    value: "anthropic:claude-opus-4-7",
    label: "Claude Opus 4.7 · Anthropic direct — ~$1.00/site",
    hint: "Top quality, direct API.",
  },
];

// Research-model dropdown — same model IDs as DESIGN_MODELS but with
// research-phase costs and reliability flags from empirical testing
// (2026-04-28, Sevasti + Iapetos businesses on Symi).
export const RESEARCH_MODELS: DesignModelOption[] = [
  {
    value: "openrouter:google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite · OpenRouter — ~$0.006/dossier",
    hint: "Cheapest. Surprisingly thorough — typical 10 sources, ~5s.",
  },
  {
    value: "openrouter:google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro · OpenRouter — ~$0.06/dossier (unreliable)",
    hint: "JSON parse failures observed — avoid until fixed.",
  },
  {
    value: "openrouter:anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5 · OpenRouter — ~$0.03/dossier",
    hint: "Best value. 5/6/6 dossier (sources/sigs/reviews), ~12s, 100% reliable.",
  },
  {
    value: "openrouter:anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6 · OpenRouter — ~$0.08/dossier",
    hint: "Same content as Haiku OR. Slower; pay only if Haiku misses something.",
  },
  {
    value: "openrouter:anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7 · OpenRouter — ~$0.18/dossier",
    hint: "Marginal vs Haiku/Sonnet OR. Skip unless dossier matters a lot.",
  },
  {
    value: "anthropic:claude-haiku-4-5",
    label: "Claude Haiku 4.5 · Anthropic direct — ~$0.14/dossier",
    hint: "Direct API + web_search. Bookkeeping bug: reports 0 sources despite searching.",
  },
  {
    value: "anthropic:claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 · Anthropic direct — ~$0.31/dossier",
    hint: "Premium. Deepest grounding — 13-17 sources via multi-round web_search, ~52s.",
  },
  {
    value: "anthropic:claude-opus-4-7",
    label: "Claude Opus 4.7 · Anthropic direct — ~$0.33/dossier (unreliable)",
    hint: "JSON parse failures observed — Sonnet direct delivers similar quality more reliably.",
  },
];

// Per-1M-token rates + per-call surcharges (USD). Used for cost estimation
// in F12 logging. Verified from OpenRouter / Anthropic public pricing 2026-04-28.
// inSearch: Exa for OpenRouter :online (research only); web_search for
// Anthropic-direct (research only). Design phase has no search overhead.
export const MODEL_RATES: Record<DesignModelId, { inPer1M: number; outPer1M: number; researchSearchUSD: number }> = {
  "openrouter:google/gemini-3.1-flash-lite-preview": { inPer1M: 0.25, outPer1M: 1.50, researchSearchUSD: 0.005 },
  "openrouter:google/gemini-3.1-pro-preview":         { inPer1M: 2.00, outPer1M: 12.00, researchSearchUSD: 0.005 },
  "openrouter:anthropic/claude-haiku-4.5":            { inPer1M: 1.00, outPer1M: 5.00,  researchSearchUSD: 0.005 },
  "openrouter:anthropic/claude-sonnet-4.6":           { inPer1M: 3.00, outPer1M: 15.00, researchSearchUSD: 0.005 },
  "openrouter:anthropic/claude-opus-4.7":             { inPer1M: 5.00, outPer1M: 25.00, researchSearchUSD: 0.005 },
  "anthropic:claude-haiku-4-5":                       { inPer1M: 1.00, outPer1M: 5.00,  researchSearchUSD: 0.03 },
  "anthropic:claude-sonnet-4-6":                      { inPer1M: 3.00, outPer1M: 15.00, researchSearchUSD: 0.03 },
  "anthropic:claude-opus-4-7":                        { inPer1M: 5.00, outPer1M: 25.00, researchSearchUSD: 0.03 },
};

// Places API (New) Text Search Pro SKU rate, used for F12 cost estimate
// on the search phase. Verified from Google's pricing page 2026-04-28.
// Each paginated page fetch counts as one billable call.
export const PLACES_TEXT_SEARCH_USD_PER_CALL = 0.032;

export type JobStatus = "pending" | "researching" | "designing" | "done" | "error";

export interface JobRecord {
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  modelId: DesignModelId;
  researchModelId?: DesignModelId;
  // Confirmed model strings echoed back by the underlying APIs (the served
  // model). Compare against modelId / researchModelId to verify the run
  // actually used the model the UI requested.
  actualResearchModel?: string;
  actualDesignModel?: string;
  businessName: string;
  site?: GeneratedSite;
  dossier?: unknown;
  usage?: {
    research?: { input_tokens?: number; output_tokens?: number };
    design?: { input_tokens?: number; output_tokens?: number };
  };
  elapsedMs?: { research?: number; design?: number; total?: number };
  error?: string;
}
