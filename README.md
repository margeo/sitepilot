# SitePilot

Find local businesses without a website and generate a premium mock site for each — ready to pitch.

Built with Vite + React + TypeScript and Netlify Functions.

## What it does

1. **Search** — pick a sector and a location. The app queries Google Places (New) Text Search.
2. **Filter** — keep only businesses with no website, min rating, min review count.
3. **Score** — each business gets a lead score (1–10).
4. **Generate** — one click produces a full, styled single-page mock site that follows [`SPEC.md`](SPEC.md):
   - Hero + CTA (Call, Directions, WhatsApp)
   - About, Menu / Rooms / Services (sector-aware)
   - Gallery (uses Google Place photos when available)
   - Google reviews
   - Contact card + embedded map
   - Floating WhatsApp button (uses mobile numbers only)
5. **Download / Preview** — preview in-app and download standalone `.html`.

The generator uses Claude (when `ANTHROPIC_API_KEY` is set) for custom copy, and falls back to a sector template otherwise.

## Quick start (local)

```bash
npm install
npm run dev        # runs via Netlify Dev so functions work at /.netlify/functions/*
```

Without any API keys the app runs in **Demo mode** (sample businesses, template generation).

## API keys

Create a `.env` file (see `.env.example`):

```
GOOGLE_MAPS_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
```

### Google Maps Platform

1. Go to https://console.cloud.google.com/google/maps-apis
2. Create a project, enable billing.
3. Enable **Places API (New)**.
4. Create an API key, restrict it by HTTP referrer or by IP, and paste it into `.env`.

Used for:
- Places Text Search → initial business list
- Place Details → phones, hours, reviews, photos
- Place Photos → proxied by `/photos` function

### Anthropic (optional)

1. Go to https://console.anthropic.com/
2. Create an API key. Paste it as `ANTHROPIC_API_KEY`.

Without it, the generator uses sector templates — still good, just less bespoke.

## Deploy (Netlify)

Same pattern as fueltrack:

1. Push this repo to GitHub.
2. Create a new Netlify site from the repo.
3. In **Site settings → Environment variables**, add:
   - `GOOGLE_MAPS_API_KEY`
   - `ANTHROPIC_API_KEY` (optional)
4. Build command: `npm run build` · Publish directory: `dist` · Functions: `netlify/functions` (already set in `netlify.toml`).

Or via CLI:

```bash
npx netlify-cli deploy --build --prod
```

## Project layout

```
.
├── SPEC.md                        # Agent spec — read this first
├── index.html / src/              # Vite + React frontend
│   ├── App.tsx, main.tsx
│   ├── components/                # SearchForm, ResultsTable, SitePreview
│   ├── lib/api.ts                 # Typed client for the functions
│   └── types.ts                   # Shared types
├── netlify/
│   └── functions/
│       ├── search-businesses.ts   # POST — Places Text Search
│       ├── place-details.ts       # POST — Places Details + lead score
│       ├── photos.ts              # GET  — Proxies Place Photos
│       ├── generate-site.ts       # POST — Claude + template → HTML
│       └── _shared/
│           ├── sectors.ts         # Sector themes + detection
│           ├── phones.ts          # Mobile vs landline classifier (GR-aware)
│           ├── template.ts        # The actual HTML/CSS template
│           └── demo.ts            # Demo data (no-API mode)
└── netlify.toml
```

## Customising the template

Open `netlify/functions/_shared/template.ts`. It's a single function returning the complete HTML of the site. Every owner-editable section is marked with an HTML comment (e.g. `<!-- MENU SECTION — edit items below -->`).

Sector themes (palette, labels, CTAs) live in `netlify/functions/_shared/sectors.ts`.

## Notes

- Phone classification is Greece-aware (`+30 69…` → mobile, `+30 2…` → landline) and falls back to best-effort for other countries.
- The WhatsApp button is only generated from mobile numbers. If none exists, a placeholder link (`wa.me/REPLACE_WITH_MOBILE`) is emitted — clearly marked for replacement.
- Photos are proxied through the `photos` function so the API key is never exposed client-side.
