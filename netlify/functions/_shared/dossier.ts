// Brand dossier — the intermediate representation between research and design.
// Produced by research-business.ts, consumed by the design director + assembler.

export interface Dossier {
  name: string;
  category_descriptor: string; // e.g. "Seafront family-run studios"
  address: string;
  location_notes?: string;
  season?: "summer" | "winter" | "year_round" | string;

  social: {
    instagram?: string | null;
    facebook?: string | null;
    tripadvisor?: string | null;
    airbnb?: string | null;
    booking?: string | null;
    website?: string | null;
  };

  brand_identity: {
    vibe: string; // e.g. "family-run · authentic · slow-travel premium"
    keywords: string[]; // 5-10 descriptors
    target_audience: string; // e.g. "design-literate travelers fleeing crowded islands"
    unique_story: string; // 1-3 sentences of narrative
  };

  signature_elements: string[]; // 3-6 concrete standout features

  review_highlights: Array<{
    quote: string;
    theme: string; // e.g. "sea proximity", "hosts warmth"
  }>;

  confidence: number; // 0-1, how grounded the research is
  sources?: Array<{ title?: string; uri?: string }>;
}
