# SitePilot — project context for Claude

This file is read automatically by Claude Code at session start. Project
conventions, key files, and historical reference content live here.

## Architecture quick reference

- **Frontend**: React 19 + Vite. Entry: `src/App.tsx`.
- **Backend**: Netlify functions under `netlify/functions/`. Long jobs use
  the v2 background-function pattern (filename ends in `-background.ts`,
  fire-and-forget, status polled via Netlify Blobs).
- **State persistence**: localStorage on the frontend. Cache keys live in
  `App.tsx`:
  - `sitepilot.cache.search.v1` — full SearchResponse keyed by
    JSON.stringify(filters).
  - `sitepilot.cache.dossier.v1` — research-phase dossiers, keyed by
    place_id.
  - `sitepilot.cache.business.v1` — enriched BusinessDetails, keyed by
    place_id.
  - `sitepilot.cache.site.v1` — array of GeneratedSite per place_id
    (multi-version comparison: Claude / ChatGPT / Gemini).
  - `sitepilot.last.filters.v1` — pointer to the most recent
    SearchFilters so reload restores the visible results.
  - `sitepilot.designModel.v1` / `sitepilot.researchModel.v1` — model
    dropdown selections.

## Three-phase pipeline

1. **Search businesses** (`/search-businesses`) — Google Places only,
   no AI. Bulk discovery (~14 queries × 3 pages = ~$1 per sector) or
   `/resolve-names` for known names (~$0.032 each). `probe: true` short-
   circuit is used for the demo-mode probe so it's free.
2. **Research per row** (`/research-business`) — AI dossier (~$0.006 to
   $0.33). Currently routed through the chosen research model via
   OpenRouter `:online` plugin (Exa) or Anthropic-direct
   `web_search_20250305`.
3. **Site generation per row**:
   - **API path** (`/generate-site` → `/generate-site-background`) —
     currently DEPRECATED in the UI (the green button is disabled);
     uses the design model selection. Costs ~$0.06-1.00 per site.
   - **Manual path** (`/build-design-prompt` then user-pasted HTML) —
     active default. Routes through claude.ai / chatgpt.com /
     gemini.google.com flat-rate web subscriptions; marginal cost $0.

## Manual path provider rate cards (verified 2026-04-28)

Used by the equivalent-API-cost calculation in `ManualGeneratePanel.tsx`:

| Provider | Web URL | Equivalent API model | $/1M in | $/1M out |
|---|---|---|---|---|
| Claude.ai | https://claude.ai/new | anthropic:claude-opus-4-7 | 5.00 | 25.00 |
| ChatGPT | https://chatgpt.com/ | openai:gpt-4.1 | 2.00 | 8.00 |
| Gemini | https://gemini.google.com/app | google:gemini-2.5-pro | 1.25 | 10.00 |

## Designer prompt — current LEAN version

Active as of 2026-04-28. Lives in
`netlify/functions/_shared/designer-prompt.ts` as `SITEPILOT_PROMPT_LEAN`.
~2,400 chars. Mirrors the 5-step thinking checklist Claude actually
runs internally (visible in its reasoning when building Mykonos 22 /
Taverna Alexandros / Dream Sea Moschou). Replaces the inline
frontend-design skill with a single reference line; the live skill is
loaded by Claude.ai automatically.

## Designer prompt — LEGACY (verbose) version

Kept here for reference and one-line revert. Pre-2026-04-28 prompt was
~7,800 chars total. Verbose because it pasted the entire Anthropic
frontend-design skill text inline plus elaborate emphasis markers and
explanations. Removed because:

- Claude.ai loads the live skill itself (no need to paste it inline).
- ChatGPT / Gemini benefit more from a tight 5-step checklist than a
  3,500-char design philosophy essay.
- Verbose `**CRITICAL**` / `**IMPORTANT**` / `STRICT` qualifiers and
  multi-paragraph exhortations don't change Claude's behavior — Claude
  runs its own design-thinking process regardless.
- The "two-column section head grid on desktop" prescription was the
  primary cause of layout sameness across generations. Dropped.

To revert in the source: open
`netlify/functions/_shared/designer-prompt.ts`, change the two
`export const DESIGNER_SYSTEM_*` assignments at the bottom from
`SITEPILOT_PROMPT_LEAN` to the corresponding `*_LEGACY` constant.

### Legacy `FRONTEND_DESIGN_SKILL` (verbatim from Anthropic skills repo, last synced 2026-04-28)

```
This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
```

### Legacy `SITEPILOT_RULES` (the long version of the SitePilot-specific rules)

```
# SitePilot production rules — STRICT

You are generating a bilingual single-file website for a small Greek business (tourism, hospitality, or local services). Apply the aesthetic guidance above, then follow THESE hard rules exactly.

## OUTPUT
- One complete HTML document starting with `<!doctype html>`.
- No commentary before or after. No markdown fences. No explanation.
- All CSS inline in a single `<style>` tag. All JS inline in a single `<script>` tag at the end of body.
- External resources limited to Google Fonts `<link rel="preconnect">` + the stylesheet.

## BILINGUAL — always
- Site is bilingual English + Greek (EN / EL).
- Top-right pill toggle with two buttons: EN | EL. Default EN. Persist choice to `localStorage`.
- Every visible string appears twice in the HTML:
    `<span class="lang-en">English text</span><span class="lang-el">Ελληνικά</span>`
- CSS: `body[data-lang="en"] .lang-el { display: none }` and vice versa.
- Greek text must be natural and idiomatic — not machine-translated. Use proper Greek punctuation (« »).

## SECTION STRUCTURE
- Hero first. Contact / Visit last. 4–6 sections total.
- INVENT section names to match the brand — NEVER use "About" / "Menu" / "Gallery" / "Rooms" as-is. Use specific names derived from the dossier ("The Bay", "The Table", "At the Studios", "The Hosts", "Getting to the Door", etc.).
- Each main section: 2–3 paragraphs, one pull quote lifted VERBATIM from reviews (attribute by first name or "Guest, <month year>").
- Section head: two-column grid on desktop — eyebrow + kicker on left, large heading with italic `<em>` accent on right.

## COPY
- Ground EVERY claim in the dossier. Never invent facts (prices, dishes, founder names, awards).
- Use real review quotes VERBATIM as pull quotes.
- Forbidden phrases (signal templated AI copy): "nestled", "discover", "come experience", "welcome to", "authentic flavours", "warm hospitality", "embark on", "step into", "oasis of", "hidden gem", "perfect blend", "unforgettable experience".
- Prefer concrete specifics ("30 steps to the water", "Maria's chickpea soup on Sundays", "cell signal only at the square") over generalities.

## PHONES & CTAS
- Mobile phone → wrap in both `tel:+<number>` AND `wa.me/<number>?text=<url-encoded greeting>`.
- Landline → render only if present in input (never invent).
- Directions button URL format:
    `https://www.google.com/maps/search/?api=1&query=<url-encoded name>&query_place_id=<place_id>`
  If `place_id` missing, use name + address query.
- Floating WhatsApp button: fixed bottom-right, 60px green circle (`#25D366`), hover tooltip "Chat with <host>" in the current language. On viewports under 520px: 54px, no tooltip.

## IMAGES
- NEVER hotlink from airbnb.com / booking.com / tripadvisor.com — they return 403.
- If `photo_urls` are provided in the input, use them with `loading="lazy"` and `object-fit: cover`.
- Otherwise inline SVG placeholders:
    `<img src="data:image/svg+xml;utf8,<svg ...>REPLACE · LABEL</svg>" />`
  Gradient matched to the scene (sea = blue/navy, interior = sand/cream, food = warm red, mountain = olive/stone) with a small "REPLACE · <LABEL>" text visible.
- Every image uses `object-fit: cover` so the owner can swap any aspect ratio.

## PRICES
- Intentionally omit. All pricing happens via WhatsApp / phone / OTA listings.
- Do NOT generate a menu with placeholder prices ("€9.50 Greek salad"). If the dossier has real menu data, use it; otherwise omit the menu section entirely and let the CTAs do the work.

## OWNER EDIT NOTES
Immediately after `<meta name="theme-color">`, include this exact comment block (no nested HTML comments inside it):

<!--
OWNER EDIT NOTES — read this first
Bilingual site. Every visible string appears twice: once in lang-en and once in lang-el. Edit BOTH when you change a phrase, otherwise one language version will be out of date.
Look for EDIT: markers at editable blocks. Images use object-fit:cover so any aspect ratio crops cleanly. Prices intentionally omitted — all pricing happens via WhatsApp, phone, or OTA listings.
-->

Then add inline `<!-- EDIT: LABEL -->` markers above editable image sources, the phone number, the floating WhatsApp button, and the first paragraph of each section.

CRITICAL: NEVER place `<!-- ... -->` inside another HTML comment — it prematurely closes the outer comment and leaks text into the page body.

## META
- `<title>`: "<Business Name> · <Location>" — specific, not generic.
- `<meta name="description">`: one sharp sentence, under 160 chars, specific to this brand. No clichés.
- `<meta name="theme-color">`: match the palette's primary dark color.

## FOOTER
Small discreet footer: brand italic serif, nav links, "© <current year> <brand> · <location>", "Photos © the owners" line.

Produce the complete bilingual HTML now. No commentary before or after it.
```

## Conventions

- **Branches**: dev (auto-deploys to https://dev--sitepilot-app.netlify.app)
  + main (production, https://sitepilot-app.netlify.app). Merging dev to
  main has historically been done by `git push origin dev:main` from the
  dev worktree.
- **TypeScript**: strict; run `npx tsc -b` before committing.
- **Comments in code**: only when the WHY is non-obvious. Don't narrate
  the WHAT.
- **No emojis** in code or commits unless explicitly requested.
