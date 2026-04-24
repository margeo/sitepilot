# Pending / deferred items — SitePilot

Items noted during development that are logged for future revisit, not
currently scheduled. Each row should be picked up with a fresh "do we
still want this?" check before implementation.

Maintained by hand. Last updated: 2026-04-24.

---

## OTA scraper (Airbnb / Booking / VRBO) as a separate search option

Context: user wants a third search path (in addition to Google Places quick
and deep) that pulls listings from Airbnb / Booking / VRBO. The Airbnb side
has a structural limitation — individual hosts rarely map to Google Places
entries, so dossier enrichment will fail on most Airbnb results. Booking is
more usable because properties have real addresses.

Three approaches considered, all deferred:

### A. Scraping service proxy (ScrapingBee / Apify / ScrapFly)
- UX: user pastes Booking/Airbnb search URL → Netlify fn calls scraping service → parses results.
- Reliability: High — services handle CF/captcha/rotating IPs.
- Cost: ~$30–50/month for a paid plan.
- Legal: TOS-gray, same as raw scraping but outsourced.

### B. Playwright service on separate infrastructure (Railway / Render)
- UX: same as A, but we run our own headless browser on a separate $5–10/month box outside Netlify.
- Reliability: Medium-high — we maintain the browser automation.
- Cost: ~$5–10/month for the infra.
- Legal: TOS-gray.

### C. Enhanced screenshot import
- UX: extend existing ScreenshotImport flow with an explicit "OTA mode" toggle + a prompt tuned for Booking/Airbnb page layouts. User manually screenshots the OTA search results page from their own browser.
- Reliability: Manual; depends on user capturing all results.
- Cost: $0 extra; piggybacks on existing Gemini vision budget.
- Legal: Zero TOS risk — user fetches the page themselves, app only processes pasted image.

**Status:** Deferred. Re-examine when we have real demand for OTA coverage that the existing screenshot-import flow doesn't already handle.

---

## web_search tool integration in the designer (Anthropic direct only)

Context: letting Claude call the `web_search` tool during the design phase
so it can peek at the business's Instagram / Facebook / Tripadvisor live
while writing copy. This is a Claude Messages API tool — not available
through OpenRouter.

- Scope: only options 6-8 (Anthropic direct Haiku / Sonnet / Opus).
- Cost: ~$10 per 1,000 searches + extra tokens. Estimated ~$0.01–$0.03 added per site.
- Latency: +5–10 s per site from the extra tool round-trips.
- Value: marginal — we already do web research in the Gemini+grounding dossier phase.

**Status:** Deferred per user instruction ("not yet, write down for future testing").
Revisit after we have sample outputs from the v3 pipeline and can judge whether
design-time web lookups actually improve quality.

---

## 20 km radius `searchNearby` fallback for deep-search

Context: when proposing the deep-search upgrade, I included a `searchNearby`
via geocoded coordinates + 20 km radius as a fallback data source. User
explicitly excluded it from the first deep-search shipment.

- Would catch places that text search misses because of weak text relevance but strong location (e.g. a villa listed only as "private accommodation" with no keyword match).
- Adds latency (needs geocoding + a second set of API calls).
- Adds API cost (~$17 per 1,000 `searchNearby` calls).

**Status:** Deferred. Revisit if deep-search still shows obvious gaps after real-world use.

---

## Code hygiene / minor

- `tsconfig.tsbuildinfo` should be in `.gitignore` (currently untracked but generated on every build).
- Stray `public/ChatGPT Image Apr 24, 2026, *.png` files (two of them) still on disk — user deferred deletion pending other work.
- `_shared/template.ts` + `_shared/modular-template.ts` + the old v1/v2 generation logic became dead code when v3 shipped. Candidate for removal once v3 is validated end-to-end.
- Research phase is hardcoded to Gemini 2.5 Flash. Future: let the research-phase model be selected (a second dropdown, same 8 options — partially in progress at time of writing).

---

## How to pick this up

1. Read the current [session state memory](~/.claude/projects/C--Users-newla-SitePilot/memory/project_sitepilot_state.md) for the very latest context.
2. Confirm the item above is still relevant (projects pivot).
3. Ship a small diff, commit, test live.
