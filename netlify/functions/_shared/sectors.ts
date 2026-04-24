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

export interface SectorTheme {
  label: string;
  // Palette (hero + accents)
  primary: string;      // brand color
  primaryDark: string;
  accent: string;       // CTA color
  bgTint: string;       // subtle section background
  heroOverlay: string;  // rgba overlay on hero image
  // Page labels + structure
  servicesLabel: string;        // "Menu", "Rooms", "Services"
  servicesSingular: string;     // "dish", "room", "service"
  tagline: string;              // generic hero subtitle
  aboutHeading: string;
  ctaReserve: string;           // "Book Now" / "Reserve a table"
  keywords: string[];           // SEO anchors
  suggestedPages: string[];
  hasMenu: boolean;
  hasRooms: boolean;
  hasGallery: boolean;
}

export const SECTOR_THEMES: Record<Sector, SectorTheme> = {
  restaurant: {
    label: "Restaurant",
    primary: "#8a1a1a", primaryDark: "#5c0f0f", accent: "#d4a24c",
    bgTint: "#faf5ec", heroOverlay: "rgba(20,10,5,0.55)",
    servicesLabel: "Menu", servicesSingular: "dish",
    tagline: "Authentic flavours, warm hospitality.",
    aboutHeading: "Our story",
    ctaReserve: "Reserve a table",
    keywords: ["restaurant", "dining", "cuisine", "menu", "reservation"],
    suggestedPages: ["Home", "Menu", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  tavern: {
    label: "Tavern",
    primary: "#2d5a3f", primaryDark: "#1a3a28", accent: "#e7b04b",
    bgTint: "#f7f3e8", heroOverlay: "rgba(15,25,15,0.55)",
    servicesLabel: "Menu", servicesSingular: "dish",
    tagline: "Family-run taverna — traditional dishes, local ingredients.",
    aboutHeading: "A family story",
    ctaReserve: "Reserve a table",
    keywords: ["taverna", "traditional", "greek food", "family-run", "local cuisine"],
    suggestedPages: ["Home", "Menu", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  beach_bar: {
    label: "Beach Bar",
    primary: "#0a6b8a", primaryDark: "#064358", accent: "#f2b83a",
    bgTint: "#eaf6fa", heroOverlay: "rgba(5,30,45,0.45)",
    servicesLabel: "Drinks & Bites", servicesSingular: "item",
    tagline: "Sun, sea, and sunset cocktails.",
    aboutHeading: "The vibe",
    ctaReserve: "Book a sunbed",
    keywords: ["beach bar", "cocktails", "sunbeds", "sunset", "beach club"],
    suggestedPages: ["Home", "Drinks", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  villa: {
    label: "Villa / Rental",
    primary: "#1e3c52", primaryDark: "#0f2230", accent: "#c49762",
    bgTint: "#f4ede3", heroOverlay: "rgba(10,20,30,0.50)",
    servicesLabel: "The Villa", servicesSingular: "room",
    tagline: "A private retreat, steps from the sea.",
    aboutHeading: "About the villa",
    ctaReserve: "Check availability",
    keywords: ["villa rental", "private pool", "holiday villa", "luxury stay"],
    suggestedPages: ["Home", "The Villa", "Gallery", "Book & Contact"],
    hasMenu: false, hasRooms: true, hasGallery: true,
  },
  hotel: {
    label: "Hotel",
    primary: "#14323f", primaryDark: "#091b22", accent: "#c8a86b",
    bgTint: "#f2ece1", heroOverlay: "rgba(10,25,30,0.50)",
    servicesLabel: "Rooms & Suites", servicesSingular: "room",
    tagline: "Your seaside escape, curated with care.",
    aboutHeading: "About us",
    ctaReserve: "Book a room",
    keywords: ["hotel", "suites", "boutique hotel", "seaside stay"],
    suggestedPages: ["Home", "Rooms", "Gallery", "Book & Contact"],
    hasMenu: false, hasRooms: true, hasGallery: true,
  },
  boutique: {
    label: "Boutique",
    primary: "#1d1d1d", primaryDark: "#000", accent: "#b58964",
    bgTint: "#f5f2ee", heroOverlay: "rgba(10,10,10,0.40)",
    servicesLabel: "Our Collection", servicesSingular: "piece",
    tagline: "Curated pieces, timeless style.",
    aboutHeading: "The boutique",
    ctaReserve: "Visit the shop",
    keywords: ["boutique", "fashion", "concept store", "handpicked", "designer"],
    suggestedPages: ["Home", "Collection", "Gallery", "Visit & Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  car_rental: {
    label: "Car Rental",
    primary: "#0f4c75", primaryDark: "#082f49", accent: "#f2a83a",
    bgTint: "#edf4fa", heroOverlay: "rgba(5,30,55,0.55)",
    servicesLabel: "Our Fleet", servicesSingular: "car",
    tagline: "Explore the island on your terms.",
    aboutHeading: "Who we are",
    ctaReserve: "Reserve a car",
    keywords: ["car rental", "rent a car", "island rentals"],
    suggestedPages: ["Home", "Fleet", "Gallery", "Book & Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  boat_rental: {
    label: "Boat Rental",
    primary: "#0c4b73", primaryDark: "#062f49", accent: "#e0b84a",
    bgTint: "#e9f4fa", heroOverlay: "rgba(5,35,55,0.50)",
    servicesLabel: "Our Boats", servicesSingular: "boat",
    tagline: "Private boat trips & rentals.",
    aboutHeading: "Set sail with us",
    ctaReserve: "Book a boat",
    keywords: ["boat rental", "private cruise", "yacht charter", "sailing"],
    suggestedPages: ["Home", "Boats", "Gallery", "Book & Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  beauty_wellness: {
    label: "Beauty / Wellness",
    primary: "#6e4f58", primaryDark: "#402c33", accent: "#c99a8e",
    bgTint: "#f7ede9", heroOverlay: "rgba(55,30,35,0.45)",
    servicesLabel: "Services", servicesSingular: "treatment",
    tagline: "Care, calm, and a little indulgence.",
    aboutHeading: "About us",
    ctaReserve: "Book a treatment",
    keywords: ["beauty salon", "wellness", "spa", "hair salon"],
    suggestedPages: ["Home", "Services", "Gallery", "Book & Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  local_services: {
    label: "Local Service",
    primary: "#234155", primaryDark: "#122330", accent: "#cda05a",
    bgTint: "#f1ede4", heroOverlay: "rgba(15,25,35,0.50)",
    servicesLabel: "Services", servicesSingular: "service",
    tagline: "Professional, local, reliable.",
    aboutHeading: "About us",
    ctaReserve: "Get in touch",
    keywords: ["local service", "professional"],
    suggestedPages: ["Home", "Services", "Gallery", "Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
};

export function sectorFromGoogleTypes(types: string[] | undefined, hint?: Sector): Sector {
  const t = (types ?? []).map((x) => x.toLowerCase());
  if (hint) return hint;
  if (t.includes("lodging")) return "hotel";
  if (t.includes("bar") || t.includes("night_club")) return "beach_bar";
  if (t.includes("car_rental")) return "car_rental";
  if (t.includes("beauty_salon") || t.includes("hair_care") || t.includes("spa")) return "beauty_wellness";
  if (t.includes("clothing_store") || t.includes("shoe_store") || t.includes("jewelry_store")) return "boutique";
  if (t.includes("restaurant") || t.includes("food") || t.includes("cafe")) return "restaurant";
  return "local_services";
}
