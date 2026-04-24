// SiteSpec — the design director's output.
// Produced by LLM from a Dossier. Consumed by the modular template engine.

export type SectionCopy =
  | HeroSection
  | StorySection
  | FeaturesSection
  | GallerySection
  | OfferingsSection
  | ReviewsSection
  | ContactSection;

export interface HeroSection {
  type: "hero";
  heading: string; // business name or tagline
  subhead: string; // 12-20 word tagline
  cta_primary?: string; // "Book Now" / "Call Us" / "Reserve a Table"
  cta_secondary?: string; // "View Menu" / "See the Studios" / "Directions"
}

export interface StorySection {
  type: "story";
  heading: string; // e.g. "The Bay", "Our Story"
  body: string; // 80-200 words
  image_side?: "left" | "right" | "none";
}

export interface FeaturesSection {
  type: "features";
  heading?: string; // e.g. "Signature Touches", "What Makes Us Different"
  intro?: string;
  items: Array<{ heading: string; body: string }>;
}

export interface GallerySection {
  type: "gallery";
  heading?: string;
  caption?: string;
}

export interface OfferingsSection {
  type: "offerings";
  kind: "menu" | "rooms" | "services";
  heading: string; // e.g. "The Menu", "Our Studios", "Services"
  intro?: string;
  items: Array<{ name: string; description?: string; meta?: string }>;
}

export interface ReviewsSection {
  type: "reviews";
  heading?: string; // default "What Guests Say"
}

export interface ContactSection {
  type: "contact";
  heading?: string; // default "Visit Us"
  closer?: string; // short paragraph above the contact card
}

export interface SiteSpec {
  palette_id: string;
  sections: SectionCopy[];
}
