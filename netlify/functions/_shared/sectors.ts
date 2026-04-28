export type Sector =
  | "restaurants_tavernas"
  | "cafes_bars_pubs"
  | "bakeries"
  | "accommodations"
  | "boutique"
  | "car_rental"
  | "boat_rental"
  | "beauty_wellness"
  | "local_services"
  // Phase 2 additions (2026-04-28).
  | "barbers"
  | "tour_operators"
  | "wineries"
  | "ice_cream"
  | "yoga_pilates"
  | "photographers"
  | "bookstores"
  | "jewelers"
  | "galleries"
  | "medical_dental"
  | "real_estate"
  | "schools";

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
  restaurants_tavernas: {
    label: "Restaurants & Tavernas",
    primary: "#8a1a1a", primaryDark: "#5c0f0f", accent: "#d4a24c",
    bgTint: "#faf5ec", heroOverlay: "rgba(20,10,5,0.55)",
    servicesLabel: "Menu", servicesSingular: "dish",
    tagline: "Authentic flavours, warm hospitality.",
    aboutHeading: "Our story",
    ctaReserve: "Reserve a table",
    keywords: [
      "restaurant", "taverna", "dining", "cuisine", "menu", "reservation",
      "greek food", "traditional", "family-run", "local cuisine",
    ],
    suggestedPages: ["Home", "Menu", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  cafes_bars_pubs: {
    label: "Cafes, Bars & Pubs",
    primary: "#0a6b8a", primaryDark: "#064358", accent: "#f2b83a",
    bgTint: "#eaf6fa", heroOverlay: "rgba(5,30,45,0.45)",
    servicesLabel: "Drinks & Bites", servicesSingular: "item",
    tagline: "From morning espresso to sunset cocktails.",
    aboutHeading: "The vibe",
    ctaReserve: "Book a table",
    keywords: [
      "cafe", "coffee", "espresso", "bar", "cocktail bar", "wine bar",
      "pub", "beach bar", "sunset", "drinks", "aperitivo",
    ],
    suggestedPages: ["Home", "Drinks", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  bakeries: {
    label: "Bakeries & Patisseries",
    primary: "#7a4a23", primaryDark: "#4a2c14", accent: "#d9a55c",
    bgTint: "#fbf3e7", heroOverlay: "rgba(60,30,10,0.45)",
    servicesLabel: "Today's Bakes", servicesSingular: "item",
    tagline: "Fresh from the oven, every morning.",
    aboutHeading: "Our craft",
    ctaReserve: "Order ahead",
    keywords: [
      "bakery", "patisserie", "bread", "pastry", "cake", "artisan bakery",
      "traditional bakery", "Greek bakery", "fresh bread", "homemade",
    ],
    suggestedPages: ["Home", "Bakes", "Gallery", "Visit & Contact"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  accommodations: {
    label: "Accommodations",
    primary: "#14323f", primaryDark: "#091b22", accent: "#c8a86b",
    bgTint: "#f2ece1", heroOverlay: "rgba(10,25,30,0.50)",
    servicesLabel: "Rooms & Suites", servicesSingular: "room",
    tagline: "Your seaside escape, curated with care.",
    aboutHeading: "About us",
    ctaReserve: "Book a room",
    keywords: [
      "hotel", "villa", "guesthouse", "apartment", "holiday rental",
      "studio", "bed and breakfast", "boutique hotel", "seaside stay", "private pool",
    ],
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
  // Phase 2 additions — only used by the legacy template.ts pipeline,
  // which is no longer in the active path. Minimal placeholders just
  // satisfy the Record<Sector, SectorTheme> type. The lean prompt + per-
  // sector PRESETS in src/design-presets.ts drive the actual look now.
  barbers: {
    label: "Barbers", primary: "#1a1a1a", primaryDark: "#000000", accent: "#c41e3a",
    bgTint: "#fafaf7", heroOverlay: "rgba(10,10,10,0.55)",
    servicesLabel: "Services", servicesSingular: "service",
    tagline: "Cuts, shaves, beard care.", aboutHeading: "The shop",
    ctaReserve: "Book a chair", keywords: ["barber", "haircut", "shave", "men's grooming"],
    suggestedPages: ["Home", "Services", "Gallery", "Book"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  tour_operators: {
    label: "Tour Operators", primary: "#0c4b73", primaryDark: "#062f49", accent: "#f2b83a",
    bgTint: "#eaf4fa", heroOverlay: "rgba(5,30,55,0.55)",
    servicesLabel: "Tours", servicesSingular: "tour",
    tagline: "Guided experiences, locally led.", aboutHeading: "About",
    ctaReserve: "Book a tour", keywords: ["tour", "excursion", "guided", "day trip"],
    suggestedPages: ["Home", "Tours", "Gallery", "Book"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  wineries: {
    label: "Wineries", primary: "#3d1f3d", primaryDark: "#1f0f1f", accent: "#c9a96e",
    bgTint: "#f4ecdc", heroOverlay: "rgba(40,20,40,0.55)",
    servicesLabel: "Wines", servicesSingular: "wine",
    tagline: "Grown, fermented, bottled here.", aboutHeading: "Terroir",
    ctaReserve: "Book a tasting", keywords: ["winery", "vineyard", "wine tasting", "cellar"],
    suggestedPages: ["Home", "Wines", "Tastings", "Visit"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  ice_cream: {
    label: "Ice Cream / Gelato", primary: "#ffb5c5", primaryDark: "#c4848e", accent: "#3d2817",
    bgTint: "#fff5d6", heroOverlay: "rgba(255,181,197,0.30)",
    servicesLabel: "Flavors", servicesSingular: "flavor",
    tagline: "Made fresh, scooped daily.", aboutHeading: "About",
    ctaReserve: "Find us", keywords: ["ice cream", "gelato", "παγωτό"],
    suggestedPages: ["Home", "Flavors", "Find us"],
    hasMenu: true, hasRooms: false, hasGallery: true,
  },
  yoga_pilates: {
    label: "Yoga / Pilates / Gyms", primary: "#5a6b3d", primaryDark: "#36431f", accent: "#c44536",
    bgTint: "#f4ecdc", heroOverlay: "rgba(50,60,40,0.45)",
    servicesLabel: "Classes", servicesSingular: "class",
    tagline: "Move, breathe, recover.", aboutHeading: "The studio",
    ctaReserve: "Book a class", keywords: ["yoga", "pilates", "fitness"],
    suggestedPages: ["Home", "Schedule", "Teachers", "Book"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  photographers: {
    label: "Photographers", primary: "#0a0a0a", primaryDark: "#000000", accent: "#a8a29e",
    bgTint: "#fafaf7", heroOverlay: "rgba(0,0,0,0.40)",
    servicesLabel: "Portfolio", servicesSingular: "shoot",
    tagline: "Image-led storytelling.", aboutHeading: "About",
    ctaReserve: "Contact for a quote", keywords: ["photographer", "wedding photography", "portrait"],
    suggestedPages: ["Home", "Portfolio", "About", "Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  bookstores: {
    label: "Bookstores", primary: "#2d3a2e", primaryDark: "#15201a", accent: "#c44536",
    bgTint: "#f4ecdc", heroOverlay: "rgba(20,30,25,0.50)",
    servicesLabel: "Picks", servicesSingular: "title",
    tagline: "Curated reading, locally chosen.", aboutHeading: "About",
    ctaReserve: "Visit us", keywords: ["bookstore", "books", "βιβλιοπωλείο"],
    suggestedPages: ["Home", "Picks", "Events", "Visit"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  jewelers: {
    label: "Jewelers", primary: "#1a1a1a", primaryDark: "#000000", accent: "#c9a96e",
    bgTint: "#fafaf7", heroOverlay: "rgba(0,0,0,0.45)",
    servicesLabel: "Collection", servicesSingular: "piece",
    tagline: "Handmade jewellery, made here.", aboutHeading: "The maker",
    ctaReserve: "Visit the studio", keywords: ["jeweler", "goldsmith", "handmade jewelry"],
    suggestedPages: ["Home", "Collection", "About", "Visit"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  galleries: {
    label: "Galleries / Studios", primary: "#fafaf7", primaryDark: "#dddddd", accent: "#1a1a1a",
    bgTint: "#fafaf7", heroOverlay: "rgba(0,0,0,0.30)",
    servicesLabel: "Works", servicesSingular: "work",
    tagline: "Contemporary work, exhibited locally.", aboutHeading: "About",
    ctaReserve: "Visit", keywords: ["gallery", "art gallery", "studio"],
    suggestedPages: ["Home", "Works", "Visit"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  medical_dental: {
    label: "Medical / Dental", primary: "#1a3a5c", primaryDark: "#0a2440", accent: "#5b8aaf",
    bgTint: "#f0f4f8", heroOverlay: "rgba(20,40,70,0.45)",
    servicesLabel: "Services", servicesSingular: "treatment",
    tagline: "Trusted local care.", aboutHeading: "About",
    ctaReserve: "Book an appointment", keywords: ["dentist", "doctor", "clinic", "medical"],
    suggestedPages: ["Home", "Services", "Team", "Contact"],
    hasMenu: false, hasRooms: false, hasGallery: false,
  },
  real_estate: {
    label: "Real Estate", primary: "#0d2438", primaryDark: "#06121d", accent: "#d99752",
    bgTint: "#f4ecdc", heroOverlay: "rgba(15,25,40,0.55)",
    servicesLabel: "Listings", servicesSingular: "listing",
    tagline: "Local property expertise.", aboutHeading: "About",
    ctaReserve: "Get in touch", keywords: ["real estate", "property", "agent"],
    suggestedPages: ["Home", "Listings", "About", "Contact"],
    hasMenu: false, hasRooms: false, hasGallery: true,
  },
  schools: {
    label: "Schools (driving / music / tutoring)", primary: "#1a3a5c", primaryDark: "#0a2440", accent: "#f2b83a",
    bgTint: "#f0f4f8", heroOverlay: "rgba(20,40,70,0.45)",
    servicesLabel: "Programs", servicesSingular: "program",
    tagline: "Learn locally, with experienced teachers.", aboutHeading: "About",
    ctaReserve: "Enroll", keywords: ["school", "tutoring", "music school", "driving school"],
    suggestedPages: ["Home", "Programs", "Teachers", "Enroll"],
    hasMenu: false, hasRooms: false, hasGallery: false,
  },
};

export function sectorFromGoogleTypes(types: string[] | undefined, hint?: Sector): Sector {
  const t = (types ?? []).map((x) => x.toLowerCase());
  if (hint) return hint;
  if (
    t.includes("lodging") ||
    t.includes("hotel") ||
    t.includes("guest_house") ||
    t.includes("bed_and_breakfast")
  ) {
    return "accommodations";
  }
  if (t.includes("bar") || t.includes("pub") || t.includes("wine_bar") || t.includes("night_club")) {
    return "cafes_bars_pubs";
  }
  if (t.includes("cafe") || t.includes("coffee_shop")) return "cafes_bars_pubs";
  if (t.includes("bakery")) return "bakeries";
  if (t.includes("car_rental")) return "car_rental";
  if (t.includes("beauty_salon") || t.includes("hair_care") || t.includes("spa")) return "beauty_wellness";
  if (t.includes("clothing_store") || t.includes("shoe_store") || t.includes("jewelry_store")) return "boutique";
  if (t.includes("restaurant") || t.includes("food") || t.includes("greek_restaurant")) {
    return "restaurants_tavernas";
  }
  return "local_services";
}
