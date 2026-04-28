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
  },
  {
    slug: "ink-orange-bone",
    label: "Ink · orange · bone",
    description:
      "Dominant ink #1a1a1a. Orange #ff5f1f accent. Bone #fafaf7 background. High-contrast modern.",
  },
  {
    slug: "forest-sand-brick",
    label: "Forest · sand · brick",
    description:
      "Dominant forest green #2d3a2e. Sand #e8d5a8 secondary. Brick red #c44536 accent. Earthy luxe.",
  },
  {
    slug: "black-mint-grays",
    label: "Black · mint · grays",
    description:
      "Black #0a0a0a dominant. Mint #00ff9f accent. Neutral grays for body text. Tech-forward dark.",
  },
  {
    slug: "aegean-bone",
    label: "Aegean blues + bone white",
    description:
      "Aegean blue #00509d dominant. Bone white #fafaf7 background. Light sand #f0e6d2 secondary. Crisp Greek-island.",
  },
  {
    slug: "terracotta-cream-navy",
    label: "Terracotta + cream + navy",
    description:
      "Cream #f4ecdc background. Terracotta #c44536 dominant warm. Navy #0d2438 type and accent. Mediterranean editorial classic.",
  },
  {
    slug: "olive-sand-ink",
    label: "Olive + sand + ink",
    description:
      "Olive green #5a6b3d dominant. Warm sand #e8d5a8 background. Deep ink #1a1a1a type. Earthy, grounded.",
  },
  {
    slug: "emerald-gold",
    label: "Deep emerald + gold",
    description:
      "Deep emerald #0e3b2e dominant. Gold #c9a96e accent. Cream #f4ecdc background highlights. Luxe heritage.",
  },
  {
    slug: "high-contrast-bw",
    label: "High-contrast B&W",
    description:
      "Pure black #000000 + pure white #ffffff. One single typographic accent (red, electric blue, or yellow) used sparingly. Brutalist or French-boutique adjacent.",
  },
  {
    slug: "soft-pastels",
    label: "Soft pastels (pink · mint · cream)",
    description:
      "Powder pink #ffd5d5 + mint #c8e6c9 + butter cream #fff5d6. Optional dusty blue accent. Soft gen-z friendly.",
  },
  {
    slug: "navy-brass-ivory",
    label: "Navy · brass · ivory",
    description:
      "Deep navy primary. Brass #b8860b accent. Ivory background. Luxury-villa palette.",
  },
  {
    slug: "bone-espresso-sage",
    label: "Bone · espresso · sage",
    description:
      "Bone #fafaf7 dominant. Espresso brown #3d2817 type. Sage green #a8b5a0 accent. Specialty coffee.",
  },
  {
    slug: "black-amber-oxblood",
    label: "Black · amber · oxblood",
    description:
      "Deep black #0a0a0a dominant. Amber #d4a574 accent. Oxblood #722f37 secondary. Cocktail bar / dim.",
  },
  {
    slug: "warm-cream-flour-rust",
    label: "Cream · flour · rust",
    description:
      "Warm cream #f5e9d4 dominant. Flour beige #e8d5b7 secondary. Deep brown #3d2817 type. Rust #b2492a accent. Artisan bakery.",
  },
  {
    slug: "vintage-brown-cream-red",
    label: "Brown · cream · barber-red",
    description:
      "Deep brown #3d2817 dominant. Cream secondary. Barber red #c41e3a accent. Vintage barber.",
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
  },
  {
    slug: "geometric-modern",
    label: "Geometric modern (Geist / Satoshi)",
    description:
      "Display + body: Geist Sans (or Satoshi as fallback via Inter). Mono accents: Geist Mono for labels and specs. Modern minimal — Apple / Linear / Stripe adjacent.",
  },
  {
    slug: "humanist-friendly",
    label: "Humanist friendly (Manrope / Outfit)",
    description:
      "Display + body: Manrope as primary, Outfit as alternative. Warm, rounded, approachable sans-serif throughout. Friendly tone — small business hospitality.",
  },
  {
    slug: "brutalist-default",
    label: "Brutalist default (Times / Helvetica)",
    description:
      "Use the browser default fonts only — Times New Roman for serif headings, Helvetica or system-ui for body. Brutalist / raw / anti-design.",
  },
  {
    slug: "display-contrast-mono",
    label: "Display contrast (Cormorant + Mono)",
    description:
      "Display: Cormorant Garamond (large, italic for accents). Body: clean humanist sans (Manrope or Inter). Editorial labels and small-caps in JetBrains Mono. High-contrast pairing.",
  },
  {
    slug: "vintage-classical",
    label: "Vintage classical (Playfair + Bebas)",
    description:
      "Display: Playfair Display (high-contrast serif) OR Bebas Neue (condensed sans for impact). Body: Inter. Vintage poster / barber / industrial.",
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
