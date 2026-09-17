---
name: travel-site
description: Maintain this repository's source-first, mobile-first personal travel websites. Use for adding, updating, validating, building, or deploying a trip.
---

# Travel Site Skill

This repo follows a **stable runtime + structured trip source + generated output** architecture inspired by `OWENLEEzy/happy-trip-site`, adapted for this user's GitHub Pages workflow and the user-approved Gemini mobile design.

## Non-negotiable contract

1. `trips/<slug>/` is the source of truth.
2. `runtime/<id>/` is shared UI/runtime. A new restaurant or changed time does **not** justify editing runtime.
3. `dist/` is disposable generated output. Never hand-edit it.
4. Trip facts, UI choices, and media choices stay separated.
5. Preserve exact user-provided times, place names, links, and notes. Do not silently invent missing facts.
6. Existing UI with `style_policy: preserve-confirmed` or `locked: true` is preserved unless the user explicitly asks for redesign.
7. Every trip change must pass source verify → build → generated verify. Do not claim mobile browser verification unless the Playwright gate actually passes.

## Repository model

```text
trips/<slug>/
  meta.json
  days/day-1.json ...
  candidates.json
  tasks.json
  packing.json
  ui-brief.json
  media-brief.json
runtime/<runtime-id>/
  runtime.json
  template-parts/
  js-parts/
scripts/
  build.mjs
  verify.mjs
  verify-mobile-runtime.mjs
dist/                  # generated; gitignored
```

### Facts: `meta.json`, `days/`, candidates/tasks/packing
Keep factual travel data here. Optional places belong in `candidates.json` unless the user explicitly promotes them into a day. Keep assumptions and uncertain items visible in `meta.json`.

### Visual contract: `ui-brief.json`
Do not mix styling into itinerary facts. Existing confirmed designs are authoritative. For this repo, Okinawa is locked to the user-approved `gemini-mobile-v1` experience.

For a **new trip**:
- If the user says to reuse an existing style/runtime, clone its confirmed UI contract and only change destination data.
- If no style is specified, prepare exactly three materially different choices: `sensory`, `editorial`, `navigator`. Show real trip content, recommend one, and record the selected option before production generation.

### Media: `media-brief.json`
Keep media decisions separate from facts. If images are later added, use named-place imagery from verifiable sources. Do not use an unrelated generic hero image just to fill space.

## Edit workflow

1. Read the relevant `trips/<slug>/meta.json`, day files, candidates, and UI brief.
2. Classify user input: factual change / candidate / task / packing / UI / media.
3. Make the smallest source edit. Preserve unrelated content.
4. For route changes, keep driving/walking order geographically coherent. Do not add detours solely to consume saved places.
5. For meals, do not stack multiple deliberate destination restaurants into one day unless the user explicitly wants a food crawl.
6. Record unresolved facts under `meta.uncertain_items`; record explicit inferred choices under `meta.assumptions`.
7. Run:
   ```bash
   npm run verify
   npm run build
   npm run verify:build
   ```
8. When Playwright is available, also run:
   ```bash
   npm run verify:mobile -- dist/<slug>/index.html
   ```
9. Only then commit/deploy.

## New-trip workflow

1. Create `trips/<slug>/` with the same source files as above.
2. Fill factual brief first: title, dates (only if known), language, sharing context, transport, lodging, day items, candidates, assumptions, uncertainties.
3. Set `meta.template` to a compatible runtime.
4. Resolve UI policy: reuse a confirmed style, or run the three-option style gate.
5. Verify/build/verify.
6. GitHub Actions publishes `dist/` to Pages automatically.

## Runtime change rule

Change runtime only for a reusable capability: e.g. a new generic map component, a shared accessibility fix, or a generic itinerary field. A runtime change must not hardcode one destination. Current `gemini-mobile-v1` still contains some optional Okinawa-oriented guide/tool panes; they are feature-gated and should be disabled for unrelated trips until generalized.

## Mobile contract

The deployed site is used on a phone while traveling. Prefer one-tap navigation, visible route context, readable cards, persistent check-off state, and tap targets around 44×44 px or larger. Static inspection is not a substitute for a real browser gate when Playwright is available.

## References

Read only as needed:
- `references/architecture.md` — system boundaries and data flow
- `references/schema.md` — source file contract
- `references/extraction-rules.md` — converting notes into trip source
- `references/design-principles.md` — when a new UI must be designed
