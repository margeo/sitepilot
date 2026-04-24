export type Sector =
  | "restaurant"
  | "tavern"
  | "beach_bar"
  | "villa"
  | "hotel"
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
  { value: "restaurant", label: "Restaurants", googleType: "restaurant" },
  { value: "tavern", label: "Taverns", googleType: "restaurant", keyword: "tavern" },
  { value: "beach_bar", label: "Beach bars", googleType: "bar", keyword: "beach bar" },
  { value: "villa", label: "Villas / rentals", googleType: "lodging", keyword: "villa" },
  { value: "hotel", label: "Hotels", googleType: "lodging", keyword: "hotel" },
  { value: "boutique", label: "Boutiques", googleType: "clothing_store", keyword: "boutique" },
  { value: "car_rental", label: "Car rentals", googleType: "car_rental" },
  { value: "boat_rental", label: "Boat rentals", googleType: "point_of_interest", keyword: "boat rental" },
  { value: "beauty_wellness", label: "Beauty / wellness", googleType: "beauty_salon" },
  { value: "local_services", label: "Local services", googleType: "point_of_interest", keyword: "local service" },
];

export type SearchDepth = "quick" | "deep";

export interface SearchFilters {
  sector: Sector;
  location: string;
  noWebsiteOnly: boolean;
  minRating: number;
  minReviews: number;
  maxResults: number;
  searchDepth: SearchDepth;
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
    label: "Gemini 3.1 Flash Lite · OpenRouter",
    hint: "Fastest, cheapest. ~$0.06/site.",
  },
  {
    value: "openrouter:google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro · OpenRouter",
    hint: "Mid-tier quality. ~$0.47/site.",
  },
  {
    value: "openrouter:anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5 · OpenRouter",
    hint: "Cheap Claude. ~$0.20/site.",
  },
  {
    value: "openrouter:anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6 · OpenRouter",
    hint: "High quality. ~$0.60/site.",
  },
  {
    value: "openrouter:anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7 · OpenRouter",
    hint: "Top quality. ~$1.00/site.",
  },
  {
    value: "anthropic:claude-haiku-4-5",
    label: "Claude Haiku 4.5 · Anthropic direct",
    hint: "Cheap Claude, direct API. ~$0.20/site.",
  },
  {
    value: "anthropic:claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 · Anthropic direct",
    hint: "High quality, direct API. ~$0.60/site.",
  },
  {
    value: "anthropic:claude-opus-4-7",
    label: "Claude Opus 4.7 · Anthropic direct",
    hint: "Top quality, direct API. ~$1.00/site.",
  },
];

export type JobStatus = "pending" | "researching" | "designing" | "done" | "error";

export interface JobRecord {
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  modelId: DesignModelId;
  businessName: string;
  site?: GeneratedSite;
  dossier?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  elapsedMs?: { research?: number; design?: number; total?: number };
  error?: string;
}
