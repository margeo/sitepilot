// Design-direction options that live in section 3 of the sidebar
// (Site generation). Each selection (aesthetic / palette / typography)
// gets injected into the system prompt as a DESIGN OVERRIDES block at
// generation time, so the operator can steer the look without editing
// the prompt itself. Strings in the "description" field are what end
// up in the prompt — written as direct directives the model can follow
// without ambiguity.
//
// Special slugs handled in code:
//   ""        — operator left it on "Let AI decide" — slot is OMITTED
//               from the prompt block entirely.
//   "random"  — frontend resolves to a real slug at generation time.

export interface DesignOption {
  slug: string;
  label: string;
  description: string;
  // PALETTE entries: ordered [dominant, accent, background] hex strings.
  // Used by the live preview swatches in section 3 of the sidebar.
  colors?: string[];
  // TYPOGRAPHY entries: CSS font-family values for the display and body
  // fonts. Used by the live preview to render sample text.
  displayFont?: string;
  bodyFont?: string;
}

// 25 aesthetic directions. Includes the user's 10 base vibes (Editorial,
// Brutalist, Refined-minimal, Maximalist, Retro-futuristic, Organic,
// Luxury-dark, Playful, Industrial, Soft-pastel) plus 15 cultural /
// material / era-based directions for genuine variety across runs.
export const AESTHETICS: DesignOption[] = [
  // Editorial / publication
  {
    slug: "editorial-magazine",
    label: "Editorial / magazine",
    description:
      "Editorial magazine layout. Large serif display typography, asymmetric grid like NYT or fashion magazine. Drop caps on opening paragraphs, italic accents, pull quotes treated as posters with generous negative space.",
  },
  {
    slug: "editorial-mediterranean",
    label: "Editorial Mediterranean",
    description:
      "Mediterranean editorial — refined two-column layout, classical serif headlines, drop caps, italic em accents. Cream paper feel with warm earth-tone accents. Slow-travel magazine cadence.",
  },
  // Tone / temperament
  {
    slug: "brutalist-raw",
    label: "Brutalist / raw",
    description:
      "Brutalist raw. Sharp 90-degree corners (no border-radius anywhere), monospace or default-system fonts, intentionally unpolished. Rule lines, exposed grid, austere palette of two or three colors maximum.",
  },
  {
    slug: "brutalist-elegant",
    label: "Brutalist-elegant (modern)",
    description:
      "Modern brutalism. Big bold sans-serif, monochrome with one accent, asymmetric blocks, intentionally jarring transitions but each element refined. Anti-design as design — Yale Architecture / Are.na adjacent.",
  },
  {
    slug: "refined-minimal",
    label: "Refined minimal (Apple / Linear)",
    description:
      "Refined minimalism in the Apple / Linear / Stripe vein. Lots of white space, one accent color, perfect mathematical alignment. Restrained type, considered spacing, subtle micro-animations on interaction.",
  },
  {
    slug: "maximalist-chaos",
    label: "Maximalist / chaos",
    description:
      "Maximalist chaos. Bold saturated colors, overlapping layers, gradient meshes, decorative elements throughout (squiggles, stars, ornaments). Multiple font weights and sizes mixed intentionally. Color riot, controlled but loud.",
  },
  {
    slug: "luxury-dark-refined",
    label: "Luxury / dark refined",
    description:
      "Luxury dark refined. Near-black background, gold or brass accents, classical serif headlines, large negative space. Premium pacing — slow scroll-triggered reveals, considered transitions. Editorial cadence with luxury restraint.",
  },
  {
    slug: "playful-toy",
    label: "Playful / toy-like",
    description:
      "Playful toy-like. Colorful blocks, rounded everything (large border-radius), friendly bouncy typography. Bold primary colors or candy pastels, mascots or simple illustrations welcomed, micro-interactions on every hover.",
  },
  {
    slug: "industrial-utilitarian",
    label: "Industrial / utilitarian",
    description:
      "Industrial utilitarian. Engineering-drawing aesthetic — monospace type, blueprint grids, technical annotations, hairline rules. Limited palette (often two colors plus paper white). Form-follows-function, no decoration.",
  },
  {
    slug: "soft-pastel",
    label: "Soft / pastel",
    description:
      "Soft pastel gen-z aesthetic. Gentle colors (powder pink, mist blue, butter yellow), rounded shapes, dreamy gradients. Friendly approachable typography (slightly rounded sans, hand-set serifs). Light, airy, optimistic.",
  },
  {
    slug: "organic-natural",
    label: "Organic / natural",
    description:
      "Organic natural feel. Earth tones (clay, ochre, sage, oat). Hand-drawn icons or hand-set headlines. Paper or linen textures behind sections. Warm, tactile, craft sensibility — feels made by humans.",
  },
  // Era-evoking
  {
    slug: "retro-futuristic",
    label: "Retro-futuristic (70s sci-fi)",
    description:
      "Retro-futuristic 70s sci-fi. Chrome and metallic gradients, scan-line backgrounds, pixel/8-bit accents, neon highlights. Vaporwave-adjacent — vintage computing meets vintage future.",
  },
  {
    slug: "art-deco-geometric",
    label: "Art deco / geometric",
    description:
      "Art deco. Geometric symmetry, sunburst patterns, gold + black + ivory palette, slim sans paired with ornamental display serif. 1920s glamour, sharp angles.",
  },
  {
    slug: "bauhaus",
    label: "Bauhaus",
    description:
      "Bauhaus. Primary colors (red / yellow / blue), Futura or geometric sans serif, strict grids, photographic montage, modernist constructivist composition. No decoration beyond the function.",
  },
  {
    slug: "mid-century-modern",
    label: "Mid-century modern",
    description:
      "Mid-century modern. Cream + olive + mustard palette, abstract organic shapes, illustrated mascots welcomed, friendly humanist serifs. Eames-era craft, analog warmth.",
  },
  {
    slug: "memphis-80s",
    label: "Memphis / 80s",
    description:
      "Memphis 80s. Squiggles, confetti dots, hot pink + teal + black + cream, geometric chaos, terrazzo patterns, intentionally clashing typography. Italian design group vibe.",
  },
  {
    slug: "vaporwave",
    label: "Vaporwave",
    description:
      "Vaporwave. Pastel pink and purple gradients, Greek/Roman statues, glitched type, Japanese kanji accents, palm tree silhouettes, scan lines. Nostalgic surrealism.",
  },
  {
    slug: "vintage-travel-poster",
    label: "Vintage travel poster",
    description:
      "Vintage travel poster. Limited palette (3-4 colors), illustrated landmarks, condensed sans serifs, lithograph texture, art-deco-adjacent. 1930s travel-bureau romance.",
  },
  // Cultural / regional
  {
    slug: "japanese-minimal",
    label: "Japanese minimal / wabi-sabi",
    description:
      "Japanese minimal / wabi-sabi. Off-white background, single muted accent (sumi-ink black or kuroshiro), asymmetric vertical rhythm, generous negative space, subtle textures. Quiet, considered, imperfect.",
  },
  {
    slug: "scandinavian-hygge",
    label: "Scandinavian / hygge",
    description:
      "Scandinavian hygge. Soft beige + sage palette, geometric humanist sans serif, warm photography, gentle rounded corners, cozy vertical layouts. Functional minimalism with warmth.",
  },
  {
    slug: "italian-la-dolce-vita",
    label: "Italian la dolce vita",
    description:
      "Italian la dolce vita. Saturated reds and warm whites, classical Didone serifs, postcard typography, ornate borders, romantic photography. 1960s Italy in a cinematic frame.",
  },
  {
    slug: "french-boutique",
    label: "French boutique",
    description:
      "French boutique. Black + cream palette, Didone serifs (Bodoni / Didot), thin lines, fashion-editorial cadence, large hero-type headlines. Couture restraint.",
  },
  {
    slug: "greek-island-whitewash",
    label: "Greek-island whitewash",
    description:
      "Greek-island whitewash. Pure white #ffffff + Aegean blue #00509d + brushwork accents, Cycladic architecture cues. Stark contrast, minimal type, sun-bleached imagery.",
  },
  {
    slug: "tropical-botanical",
    label: "Tropical / botanical",
    description:
      "Tropical botanical. Lush greens and warm cream, hand-illustrated plant motifs, airy display serifs, generous photography. Lush, breathing, dense vegetation overlays.",
  },
  // Material / tech
  {
    slug: "glassmorphism",
    label: "Glassmorphism",
    description:
      "Glassmorphism. Frosted blurred backgrounds, translucent panels stacked over photography or gradients, subtle layered shadows, soft saturation. Modern Apple Vision adjacent.",
  },
];

// 15 palette presets. Includes the user's specific combos
// (navy+sun+paper, ink+orange+bone, forest+sand+brick, black+mint+grays,
// Aegean+bone, Terracotta+cream+navy, Olive+sand+ink, Emerald+gold,
// High-contrast B&W, Soft pastels) plus a small set of sector-tuned ones.
export const PALETTES: DesignOption[] = [
  {
    slug: "navy-sun-paper",
    label: "Navy · sun · paper",
    description:
      "Dominant navy #0d2438. Sun-yellow #d99752 accent. Cream paper #f4ecdc background. Warm editorial.",
    colors: ["#0d2438", "#d99752", "#f4ecdc"],
  },
  {
    slug: "ink-orange-bone",
    label: "Ink · orange · bone",
    description:
      "Dominant ink #1a1a1a. Orange #ff5f1f accent. Bone #fafaf7 background. High-contrast modern.",
    colors: ["#1a1a1a", "#ff5f1f", "#fafaf7"],
  },
  {
    slug: "forest-sand-brick",
    label: "Forest · sand · brick",
    description:
      "Dominant forest green #2d3a2e. Sand #e8d5a8 secondary. Brick red #c44536 accent. Earthy luxe.",
    colors: ["#2d3a2e", "#c44536", "#e8d5a8"],
  },
  {
    slug: "black-mint-grays",
    label: "Black · mint · grays",
    description:
      "Black #0a0a0a dominant. Mint #00ff9f accent. Neutral grays for body text. Tech-forward dark.",
    colors: ["#0a0a0a", "#00ff9f", "#cccccc"],
  },
  {
    slug: "aegean-bone",
    label: "Aegean blues + bone white",
    description:
      "Aegean blue #00509d dominant. Bone white #fafaf7 background. Light sand #f0e6d2 secondary. Crisp Greek-island.",
    colors: ["#00509d", "#f0e6d2", "#fafaf7"],
  },
  {
    slug: "terracotta-cream-navy",
    label: "Terracotta + cream + navy",
    description:
      "Cream #f4ecdc background. Terracotta #c44536 dominant warm. Navy #0d2438 type and accent. Mediterranean editorial classic.",
    colors: ["#c44536", "#0d2438", "#f4ecdc"],
  },
  {
    slug: "olive-sand-ink",
    label: "Olive + sand + ink",
    description:
      "Olive green #5a6b3d dominant. Warm sand #e8d5a8 background. Deep ink #1a1a1a type. Earthy, grounded.",
    colors: ["#5a6b3d", "#1a1a1a", "#e8d5a8"],
  },
  {
    slug: "emerald-gold",
    label: "Deep emerald + gold",
    description:
      "Deep emerald #0e3b2e dominant. Gold #c9a96e accent. Cream #f4ecdc background highlights. Luxe heritage.",
    colors: ["#0e3b2e", "#c9a96e", "#f4ecdc"],
  },
  {
    slug: "high-contrast-bw",
    label: "High-contrast B&W",
    description:
      "Pure black #000000 + pure white #ffffff. One single typographic accent (red, electric blue, or yellow) used sparingly. Brutalist or French-boutique adjacent.",
    colors: ["#000000", "#d4001a", "#ffffff"],
  },
  {
    slug: "soft-pastels",
    label: "Soft pastels (pink · mint · cream)",
    description:
      "Powder pink #ffd5d5 + mint #c8e6c9 + butter cream #fff5d6. Optional dusty blue accent. Soft gen-z friendly.",
    colors: ["#ffd5d5", "#c8e6c9", "#fff5d6"],
  },
  {
    slug: "navy-brass-ivory",
    label: "Navy · brass · ivory",
    description:
      "Deep navy primary. Brass #b8860b accent. Ivory background. Luxury-villa palette.",
    colors: ["#14323f", "#b8860b", "#f5f0e1"],
  },
  {
    slug: "bone-espresso-sage",
    label: "Bone · espresso · sage",
    description:
      "Bone #fafaf7 dominant. Espresso brown #3d2817 type. Sage green #a8b5a0 accent. Specialty coffee.",
    colors: ["#3d2817", "#a8b5a0", "#fafaf7"],
  },
  {
    slug: "black-amber-oxblood",
    label: "Black · amber · oxblood",
    description:
      "Deep black #0a0a0a dominant. Amber #d4a574 accent. Oxblood #722f37 secondary. Cocktail bar / dim.",
    colors: ["#0a0a0a", "#d4a574", "#722f37"],
  },
  {
    slug: "warm-cream-flour-rust",
    label: "Cream · flour · rust",
    description:
      "Warm cream #f5e9d4 dominant. Flour beige #e8d5b7 secondary. Deep brown #3d2817 type. Rust #b2492a accent. Artisan bakery.",
    colors: ["#f5e9d4", "#b2492a", "#e8d5b7"],
  },
  {
    slug: "vintage-brown-cream-red",
    label: "Brown · cream · barber-red",
    description:
      "Deep brown #3d2817 dominant. Cream secondary. Barber red #c41e3a accent. Vintage barber.",
    colors: ["#3d2817", "#c41e3a", "#f5e9d4"],
  },
  {
    slug: "turquoise-coral-sand",
    label: "Turquoise · coral · sand",
    description:
      "Turquoise #2c8b9a dominant. Coral #ff6b6b accent. Sand #f5e6d3 background. Beach bar / summer bright.",
    colors: ["#2c8b9a", "#ff6b6b", "#f5e6d3"],
  },
  {
    slug: "blush-burgundy-cream",
    label: "Blush · burgundy · cream",
    description:
      "Blush #f5d5d5 dominant. Deep burgundy accent. Cream background. Beauty / nails / soft refined.",
    colors: ["#f5d5d5", "#800020", "#f5e9d4"],
  },
];

// 6 mood-grouped typography pairs. Each is a Google Fonts pairing the
// model can resolve at runtime (Google Fonts is the only external
// resource the prompt allows).
export const TYPOGRAPHY: DesignOption[] = [
  {
    slug: "editorial-serif",
    label: "Editorial serif (Fraunces / Cormorant)",
    description:
      "Display: Fraunces (variable serif, SOFT axis) OR Cormorant Garamond. Body: Manrope or Bricolage Grotesque. Editorial elegance with a contemporary twist.",
    displayFont: "'Fraunces', 'Cormorant Garamond', serif",
    bodyFont: "'Manrope', 'Bricolage Grotesque', sans-serif",
  },
  {
    slug: "geometric-modern",
    label: "Geometric modern (Geist / Satoshi)",
    description:
      "Display + body: Geist Sans (or Satoshi as fallback via Inter). Mono accents: Geist Mono for labels and specs. Modern minimal — Apple / Linear / Stripe adjacent.",
    displayFont: "'Geist', 'Inter', sans-serif",
    bodyFont: "'Geist', 'Inter', sans-serif",
  },
  {
    slug: "humanist-friendly",
    label: "Humanist friendly (Manrope / Outfit)",
    description:
      "Display + body: Manrope as primary, Outfit as alternative. Warm, rounded, approachable sans-serif throughout. Friendly tone — small business hospitality.",
    displayFont: "'Manrope', 'Outfit', sans-serif",
    bodyFont: "'Manrope', 'Outfit', sans-serif",
  },
  {
    slug: "brutalist-default",
    label: "Brutalist default (Times / Helvetica)",
    description:
      "Use the browser default fonts only — Times New Roman for serif headings, Helvetica or system-ui for body. Brutalist / raw / anti-design.",
    displayFont: "'Times New Roman', Times, serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    slug: "display-contrast-mono",
    label: "Display contrast (Cormorant + Mono)",
    description:
      "Display: Cormorant Garamond (large, italic for accents). Body: clean humanist sans (Manrope or Inter). Editorial labels and small-caps in JetBrains Mono. High-contrast pairing.",
    displayFont: "'Cormorant Garamond', serif",
    bodyFont: "'JetBrains Mono', 'Manrope', monospace",
  },
  {
    slug: "vintage-classical",
    label: "Vintage classical (Playfair + Bebas)",
    description:
      "Display: Playfair Display (high-contrast serif) OR Bebas Neue (condensed sans for impact). Body: Inter. Vintage poster / barber / industrial.",
    displayFont: "'Bebas Neue', 'Playfair Display', serif",
    bodyFont: "'Inter', sans-serif",
  },
];

// =====================================================================
// SECTOR PRESETS — Phase 3
// One-click bundles per sector. Selecting a preset auto-fills the three
// design slots (aesthetic / palette / typography) so the operator can
// jump straight into a sensible default for their sector. After applying,
// each individual slot can still be overridden.
//
// Some sectors have multiple variants (cafes: specialty / cocktail /
// beach; accommodations: Cycladic / mountain / luxury; beauty: spa / nails;
// barbers: vintage / modern). Each variant is a separate entry — the
// dropdown filters by the currently-selected sector.
// =====================================================================

import type { Sector } from "./types";

export interface SectorPreset {
  slug: string; // unique
  label: string; // shown in the preset dropdown
  sector: Sector;
  variant?: string; // descriptive variant label, surfaced in preset label
  aestheticSlug: string; // must match a slug in AESTHETICS
  paletteSlug: string; // must match a slug in PALETTES
  typographySlug: string; // must match a slug in TYPOGRAPHY
}

export const SECTOR_PRESETS: SectorPreset[] = [
  // Restaurants & Tavernas
  {
    slug: "restaurants-editorial-navy",
    label: "Editorial warm · navy + sun + paper",
    sector: "restaurants_tavernas",
    aestheticSlug: "editorial-mediterranean",
    paletteSlug: "navy-sun-paper",
    typographySlug: "editorial-serif",
  },
  {
    slug: "restaurants-rustic-charcoal",
    label: "Rustic · charcoal + brick + bone",
    sector: "restaurants_tavernas",
    aestheticSlug: "organic-natural",
    paletteSlug: "ink-orange-bone",
    typographySlug: "vintage-classical",
  },

  // Cafes / Bars / Pubs — three variants
  {
    slug: "cafes-specialty",
    label: "Specialty coffee · bone + espresso + sage",
    sector: "cafes_bars_pubs",
    variant: "Specialty coffee",
    aestheticSlug: "refined-minimal",
    paletteSlug: "bone-espresso-sage",
    typographySlug: "geometric-modern",
  },
  {
    slug: "cafes-cocktail",
    label: "Cocktail bar · black + amber + oxblood",
    sector: "cafes_bars_pubs",
    variant: "Cocktail bar",
    aestheticSlug: "luxury-dark-refined",
    paletteSlug: "black-amber-oxblood",
    typographySlug: "editorial-serif",
  },
  {
    slug: "cafes-beach",
    label: "Beach bar · turquoise + coral + sand",
    sector: "cafes_bars_pubs",
    variant: "Beach bar",
    aestheticSlug: "playful-toy",
    paletteSlug: "turquoise-coral-sand",
    typographySlug: "humanist-friendly",
  },

  // Bakeries
  {
    slug: "bakeries-artisan",
    label: "Artisan · cream + flour + rust",
    sector: "bakeries",
    aestheticSlug: "organic-natural",
    paletteSlug: "warm-cream-flour-rust",
    typographySlug: "editorial-serif",
  },

  // Accommodations — three variants
  {
    slug: "accommodations-cycladic",
    label: "Cycladic · Aegean blue + bone",
    sector: "accommodations",
    variant: "Cycladic",
    aestheticSlug: "greek-island-whitewash",
    paletteSlug: "aegean-bone",
    typographySlug: "editorial-serif",
  },
  {
    slug: "accommodations-mountain",
    label: "Mountain · forest + sand + brick",
    sector: "accommodations",
    variant: "Mountain",
    aestheticSlug: "scandinavian-hygge",
    paletteSlug: "forest-sand-brick",
    typographySlug: "humanist-friendly",
  },
  {
    slug: "accommodations-luxury",
    label: "Luxury villa · navy + brass + ivory",
    sector: "accommodations",
    variant: "Luxury villa",
    aestheticSlug: "luxury-dark-refined",
    paletteSlug: "navy-brass-ivory",
    typographySlug: "editorial-serif",
  },

  // Boutique
  {
    slug: "boutique-fashion-editorial",
    label: "Fashion editorial · high-contrast B&W",
    sector: "boutique",
    aestheticSlug: "french-boutique",
    paletteSlug: "high-contrast-bw",
    typographySlug: "display-contrast-mono",
  },

  // Car rentals
  {
    slug: "car-rental-utilitarian",
    label: "Utilitarian · charcoal + mustard + bone",
    sector: "car_rental",
    aestheticSlug: "industrial-utilitarian",
    paletteSlug: "high-contrast-bw",
    typographySlug: "geometric-modern",
  },

  // Boat rentals
  {
    slug: "boat-rental-nautical",
    label: "Nautical luxe · navy + brass + ivory",
    sector: "boat_rental",
    aestheticSlug: "luxury-dark-refined",
    paletteSlug: "navy-brass-ivory",
    typographySlug: "editorial-serif",
  },

  // Beauty / wellness — two variants
  {
    slug: "beauty-spa-serene",
    label: "Spa serene · olive + sand + ink",
    sector: "beauty_wellness",
    variant: "Spa",
    aestheticSlug: "japanese-minimal",
    paletteSlug: "olive-sand-ink",
    typographySlug: "editorial-serif",
  },
  {
    slug: "beauty-nails",
    label: "Nails / beauty · blush + burgundy + cream",
    sector: "beauty_wellness",
    variant: "Nails / beauty",
    aestheticSlug: "soft-pastel",
    paletteSlug: "blush-burgundy-cream",
    typographySlug: "editorial-serif",
  },

  // Local services
  {
    slug: "local-services-trust-first",
    label: "Trust-first · navy + sun + paper",
    sector: "local_services",
    aestheticSlug: "refined-minimal",
    paletteSlug: "navy-sun-paper",
    typographySlug: "humanist-friendly",
  },

  // Phase 2 sectors

  // Barbers — two variants
  {
    slug: "barbers-vintage",
    label: "Vintage · brown + cream + barber-red",
    sector: "barbers",
    variant: "Vintage",
    aestheticSlug: "vintage-travel-poster",
    paletteSlug: "vintage-brown-cream-red",
    typographySlug: "vintage-classical",
  },
  {
    slug: "barbers-modern",
    label: "Modern industrial · ink + orange + bone",
    sector: "barbers",
    variant: "Modern",
    aestheticSlug: "industrial-utilitarian",
    paletteSlug: "ink-orange-bone",
    typographySlug: "vintage-classical",
  },

  // Tour operators
  {
    slug: "tour-operators-adventure",
    label: "Adventure editorial · Aegean + bone",
    sector: "tour_operators",
    aestheticSlug: "editorial-magazine",
    paletteSlug: "aegean-bone",
    typographySlug: "editorial-serif",
  },

  // Wineries
  {
    slug: "wineries-terroir",
    label: "Terroir · emerald + gold",
    sector: "wineries",
    aestheticSlug: "luxury-dark-refined",
    paletteSlug: "emerald-gold",
    typographySlug: "editorial-serif",
  },

  // Ice cream / Gelato
  {
    slug: "ice-cream-playful",
    label: "Playful pastel · soft pastels",
    sector: "ice_cream",
    aestheticSlug: "playful-toy",
    paletteSlug: "soft-pastels",
    typographySlug: "humanist-friendly",
  },

  // Yoga / Pilates / Gyms
  {
    slug: "yoga-serene",
    label: "Serene minimal · olive + sand + ink",
    sector: "yoga_pilates",
    aestheticSlug: "japanese-minimal",
    paletteSlug: "olive-sand-ink",
    typographySlug: "editorial-serif",
  },

  // Photographers
  {
    slug: "photographers-portfolio",
    label: "Portfolio-first · high-contrast B&W",
    sector: "photographers",
    aestheticSlug: "editorial-magazine",
    paletteSlug: "high-contrast-bw",
    typographySlug: "display-contrast-mono",
  },

  // Jewelers
  {
    slug: "jewelers-handcrafted",
    label: "Handcrafted · emerald + gold",
    sector: "jewelers",
    aestheticSlug: "luxury-dark-refined",
    paletteSlug: "emerald-gold",
    typographySlug: "editorial-serif",
  },

  // Galleries
  {
    slug: "galleries-contemporary",
    label: "Contemporary · high-contrast B&W",
    sector: "galleries",
    aestheticSlug: "brutalist-elegant",
    paletteSlug: "high-contrast-bw",
    typographySlug: "geometric-modern",
  },

  // Bookstores
  {
    slug: "bookstores-curated",
    label: "Curated · forest + sand + brick",
    sector: "bookstores",
    aestheticSlug: "editorial-magazine",
    paletteSlug: "forest-sand-brick",
    typographySlug: "editorial-serif",
  },

  // Medical / Dental — one trust-first preset
  {
    slug: "medical-trust-first",
    label: "Trust-first · navy + sun + paper",
    sector: "medical_dental",
    aestheticSlug: "refined-minimal",
    paletteSlug: "navy-sun-paper",
    typographySlug: "humanist-friendly",
  },

  // Real estate
  {
    slug: "real-estate-editorial",
    label: "Editorial · navy + sun + paper",
    sector: "real_estate",
    aestheticSlug: "editorial-magazine",
    paletteSlug: "navy-sun-paper",
    typographySlug: "editorial-serif",
  },

  // Schools (driving / music / tutoring)
  {
    slug: "schools-friendly",
    label: "Friendly · cream + flour + rust",
    sector: "schools",
    aestheticSlug: "mid-century-modern",
    paletteSlug: "warm-cream-flour-rust",
    typographySlug: "humanist-friendly",
  },
];

// Helper: pick a random non-special entry from a list.
export function pickRandom<T extends { slug: string }>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// Helper: resolve a stored selection slug into the description string
// to inject into the prompt. Returns undefined when the slot is set to
// "Let AI decide" or the slug is unknown.
export function resolveDescription(slug: string | undefined, list: DesignOption[]): string | undefined {
  if (!slug || slug === "" || slug === "let-ai-decide") return undefined;
  const found = list.find((o) => o.slug === slug);
  return found?.description;
}
