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
  suggested_pages: string[];
  generated_by: "claude" | "template";
}
