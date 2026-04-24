// A library of distinct visual "moods" for generated sites.
// The design director picks one of these based on the dossier's brand vibe.
// Each palette defines color variables + font pairings used by the modular template.

export interface Palette {
  id: string;
  name: string;
  description: string; // one-line mood description (for the design director's selection prompt)
  vars: {
    bg: string;
    bg_alt: string;
    surface: string;
    text: string;
    text_muted: string;
    heading: string;
    accent: string;
    accent_contrast: string; // text color on top of accent
    accent_soft: string;
    border: string;
    hero_overlay: string; // css gradient for hero overlay
  };
  fonts: {
    heading: string; // font-family
    body: string;
    heading_weight: number;
    heading_tracking: string; // letter-spacing
    display_transform?: "uppercase" | "none";
  };
}

// Premium, curated list — 8 distinct vibes.
export const PALETTES: Record<string, Palette> = {
  "cycladic-dusk": {
    id: "cycladic-dusk",
    name: "Cycladic Dusk",
    description: "Greek island at sunset — whitewashed with warm terracotta and deep navy. Editorial, slow, romantic.",
    vars: {
      bg: "#FAF7F2",
      bg_alt: "#F3EBE0",
      surface: "#FFFFFF",
      text: "#1F2937",
      text_muted: "#6B7280",
      heading: "#1A1F3A",
      accent: "#C76F4B",
      accent_contrast: "#FFFFFF",
      accent_soft: "#F4DCCF",
      border: "#E6DDD1",
      hero_overlay: "linear-gradient(180deg, rgba(26,31,58,0) 40%, rgba(26,31,58,0.75) 100%)",
    },
    fonts: {
      heading: `"Cormorant Garamond", "EB Garamond", Georgia, serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 500,
      heading_tracking: "-0.01em",
    },
  },
  terracotta: {
    id: "terracotta",
    name: "Terracotta Taverna",
    description: "Earthy, rustic, warm — taverna vibes, olive groves, sun-baked terracotta.",
    vars: {
      bg: "#FBF6ED",
      bg_alt: "#F1E2CD",
      surface: "#FFFDF9",
      text: "#3B2E21",
      text_muted: "#7C6A55",
      heading: "#52391F",
      accent: "#A13B1A",
      accent_contrast: "#FFFFFF",
      accent_soft: "#F0D2C2",
      border: "#DCC4A6",
      hero_overlay: "linear-gradient(180deg, rgba(59,46,33,0.1) 30%, rgba(59,46,33,0.8) 100%)",
    },
    fonts: {
      heading: `"Playfair Display", Georgia, serif`,
      body: `"Source Sans 3", "Helvetica Neue", sans-serif`,
      heading_weight: 600,
      heading_tracking: "-0.005em",
    },
  },
  "nordic-minimal": {
    id: "nordic-minimal",
    name: "Nordic Minimal",
    description: "Clean, airy, monochrome — for modern cafes, studios, boutiques. Lots of white space.",
    vars: {
      bg: "#FFFFFF",
      bg_alt: "#F5F5F4",
      surface: "#FFFFFF",
      text: "#1C1917",
      text_muted: "#78716C",
      heading: "#0C0A09",
      accent: "#18181B",
      accent_contrast: "#FFFFFF",
      accent_soft: "#E7E5E4",
      border: "#E7E5E4",
      hero_overlay: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
    },
    fonts: {
      heading: `"Fraunces", "Freight Text Pro", Georgia, serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 500,
      heading_tracking: "-0.02em",
    },
  },
  "luxury-gold": {
    id: "luxury-gold",
    name: "Luxury Gold",
    description: "Premium, elegant — dark backgrounds with gold accents. For upscale villas, fine dining, boutique hotels.",
    vars: {
      bg: "#0E0E10",
      bg_alt: "#18171A",
      surface: "#1C1B1E",
      text: "#E8E4D9",
      text_muted: "#9C9689",
      heading: "#F5EFDE",
      accent: "#C6A664",
      accent_contrast: "#0E0E10",
      accent_soft: "rgba(198,166,100,0.15)",
      border: "rgba(198,166,100,0.25)",
      hero_overlay: "linear-gradient(180deg, rgba(14,14,16,0.2) 30%, rgba(14,14,16,0.85) 100%)",
    },
    fonts: {
      heading: `"Cormorant Garamond", "EB Garamond", Georgia, serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 400,
      heading_tracking: "0.01em",
    },
  },
  "tropical-lush": {
    id: "tropical-lush",
    name: "Tropical Lush",
    description: "Beach bar / beach club energy — teal, coral, sand. Summer, carefree, sunny.",
    vars: {
      bg: "#FFF9F0",
      bg_alt: "#FDEFDA",
      surface: "#FFFFFF",
      text: "#1D3E3B",
      text_muted: "#5D7A77",
      heading: "#0F3431",
      accent: "#FF6B57",
      accent_contrast: "#FFFFFF",
      accent_soft: "#FFD9D1",
      border: "#E5D9C6",
      hero_overlay: "linear-gradient(180deg, rgba(15,52,49,0) 40%, rgba(15,52,49,0.75) 100%)",
    },
    fonts: {
      heading: `"Archivo", "Helvetica Neue", sans-serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 700,
      heading_tracking: "-0.02em",
      display_transform: "none",
    },
  },
  "industrial-urban": {
    id: "industrial-urban",
    name: "Industrial Urban",
    description: "Coffee roastery / craft brewery / third-wave. Exposed, rough, honest — charcoal and rust.",
    vars: {
      bg: "#1A1816",
      bg_alt: "#24211E",
      surface: "#2B2824",
      text: "#E8E3DA",
      text_muted: "#9B948A",
      heading: "#F3EFE4",
      accent: "#D95D39",
      accent_contrast: "#FFFFFF",
      accent_soft: "rgba(217,93,57,0.15)",
      border: "rgba(255,255,255,0.1)",
      hero_overlay: "linear-gradient(180deg, rgba(26,24,22,0.25) 30%, rgba(26,24,22,0.85) 100%)",
    },
    fonts: {
      heading: `"Archivo", "Helvetica Neue", sans-serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 800,
      heading_tracking: "-0.02em",
      display_transform: "uppercase",
    },
  },
  "soft-botanical": {
    id: "soft-botanical",
    name: "Soft Botanical",
    description: "Gentle sage, blush, cream — spas, wellness, boutiques, beauty salons. Calming, elegant.",
    vars: {
      bg: "#F7F4EE",
      bg_alt: "#E8E5DB",
      surface: "#FFFFFF",
      text: "#2E2C26",
      text_muted: "#7A766D",
      heading: "#394238",
      accent: "#819171",
      accent_contrast: "#FFFFFF",
      accent_soft: "#D6DECB",
      border: "#DDD7C8",
      hero_overlay: "linear-gradient(180deg, rgba(57,66,56,0.05) 40%, rgba(57,66,56,0.65) 100%)",
    },
    fonts: {
      heading: `"Cormorant Garamond", Georgia, serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 500,
      heading_tracking: "0",
    },
  },
  "coastal-blue": {
    id: "coastal-blue",
    name: "Coastal Blue",
    description: "Classic seaside — navy, sky blue, sand, white. Trustworthy, timeless. Good for hotels and boat rentals.",
    vars: {
      bg: "#F5F7FA",
      bg_alt: "#E4ECF3",
      surface: "#FFFFFF",
      text: "#1C2F3E",
      text_muted: "#6A7A8A",
      heading: "#0F2A44",
      accent: "#1A6BA1",
      accent_contrast: "#FFFFFF",
      accent_soft: "#D4E3EF",
      border: "#CBD9E3",
      hero_overlay: "linear-gradient(180deg, rgba(15,42,68,0.1) 30%, rgba(15,42,68,0.8) 100%)",
    },
    fonts: {
      heading: `"Fraunces", Georgia, serif`,
      body: `"Inter", "Helvetica Neue", sans-serif`,
      heading_weight: 500,
      heading_tracking: "-0.015em",
    },
  },
};

export const PALETTE_IDS = Object.keys(PALETTES);

export function paletteById(id: string | undefined): Palette {
  if (id && PALETTES[id]) return PALETTES[id];
  return PALETTES["cycladic-dusk"]; // safe default
}

export function paletteCssVars(p: Palette): string {
  const v = p.vars;
  return `
    --bg: ${v.bg};
    --bg-alt: ${v.bg_alt};
    --surface: ${v.surface};
    --text: ${v.text};
    --text-muted: ${v.text_muted};
    --heading: ${v.heading};
    --accent: ${v.accent};
    --accent-contrast: ${v.accent_contrast};
    --accent-soft: ${v.accent_soft};
    --border: ${v.border};
    --hero-overlay: ${v.hero_overlay};
    --heading-font: ${p.fonts.heading};
    --body-font: ${p.fonts.body};
    --heading-weight: ${p.fonts.heading_weight};
    --heading-tracking: ${p.fonts.heading_tracking};
  `.trim();
}
