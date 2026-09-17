---
name: travel-site
description: Maintain this repository's source-first, mobile-first personal travel websites. Use for starting trips, importing saved content, maintaining discovery pools, planning itineraries, validating, building, or deploying a trip.
---

# Travel Site Skill

This repo follows a **stable runtime + structured trip source + discovery pool + agent planning + generated output** architecture inspired by `OWENLEEzy/happy-trip-site`, adapted for this user's long-lived GitHub Pages travel workspace and the user-approved Gemini mobile design.

## Non-negotiable contract

1. `trips/<slug>/` is the source of truth.
2. `runtime/<id>/` is shared UI/runtime. A new restaurant, Instagram save, or changed time does **not** justify editing runtime.
3. `dist/` is disposable generated output. Never hand-edit it.
4. Trip facts, discovery evidence, planning drafts, UI choices, and media choices stay separated.
5. Preserve exact user-provided times, place names, links, captions, and notes. Do not silently invent missing facts.
6. Existing UI with `style_policy: preserve-confirmed` or `locked: true` is preserved unless the user explicitly asks for redesign.
7. Raw social posts are evidence, not verified planning facts. Never schedule a raw inbox record directly.
8. Every trip change must pass source verify → build → generated verify. Do not claim mobile browser verification unless the Playwright gate actually passes.

## Repository model

```text
trips/<slug>/
  meta.json
  days/day-1.json ...              # confirmed itinerary
  candidates.json                  # curated shortlist used by current runtime
  tasks.json
  packing.json
  ui-brief.json
  media-brief.json
  discovery/
    config.json
    inbox/<share-id>.json          # raw Instagram/link/screenshot evidence
    places/<place-id>.json         # normalized deduplicated place pool
  planning/
    draft-plan.json                # regenerable agent proposal
runtime/<runtime-id>/
  runtime.json
  template-parts/
  js-parts/
scripts/
  inbox-add.mjs
  pool-list.mjs
  build.mjs
  verify.mjs
  verify-mobile-runtime.mjs
dist/                              # generated; gitignored
```

## Four operating modes

### 1. Clone Mode — default for most new trips
Use when the user wants a new trip but is happy to reuse an existing confirmed runtime/style.

- Create `trips/<new-slug>/`.
- Reuse the chosen runtime and confirmed visual contract.
- Do not run a new UI selection flow.
- Build a draft trip immediately even when facts are incomplete; expose uncertainties rather than blocking cold start.

### 2. Design Mode — only when the user wants a new visual direction
- Keep factual Trip Brief separate from UI Brief.
- Prepare exactly three materially different choices: `sensory`, `editorial`, `navigator`.
- Use real trip content in previews.
- Record and lock the selected option before production generation.

### 3. Import Mode — existing itinerary/source material
Use for Gemini plans, spreadsheets, emails, booking confirmations, pasted notes, screenshots, or mixed source material.
- Extract facts first.
- Preserve provenance and unresolved items.
- Map confirmed items to `days/`, optional items to candidates/discovery, bookings to tasks/meta.
- Never overwrite a locked UI merely because imported material has its own styling.

### 4. Inbox Mode — Instagram / saved-post discovery stream
Use when the user shares Instagram posts, Reels, map links, screenshots, blogs, or other inspiration.

Pipeline:
```text
share
  → discovery/inbox/      raw source, may be incomplete
  → identify + dedupe
  → discovery/places/     normalized place entity
  → enrich + verify planning constraints
  → planning/draft-plan.json
  → explicit promotion
  → days/day-N.json
```

Rules:
- If the target trip is clear from conversation, do not ask which day it belongs to.
- Save the source URL first. If readable, extract caption/author/place hints; if inaccessible, keep the record and mark `needs_review` rather than guessing.
- One post can contain multiple places. Multiple posts can point to one place.
- Deduplicate by canonical place identity, not post URL.
- Verify changing facts that materially affect scheduling: address/location, opening/closed days, time-sensitive hours, reservations/tickets, weather/sea dependency.
- Record verification time and unresolved facts.
- After an intake batch, refresh `planning/draft-plan.json` when enough trip context exists.
- Default is **draft-first auto replan**: new saves may change the draft, but do not mutate confirmed `days/` automatically.
- Promote to confirmed days only when the user says `排進去`, `套用這版`, `更新正式行程`, or explicitly delegates automatic promotion.

For raw CLI intake:
```bash
npm run inbox:add -- <trip-slug> <shared-url> "optional note"
npm run pool:list -- <trip-slug>
```

## Facts and planning

### Confirmed source
`meta.json` and `days/` describe the executable trip. Treat fixed flights, hotels, bookings, and explicit user choices as constraints.

### Discovery source
Read `references/discovery-pool.md` before processing a large batch of saved posts. The discovery pool is a set of possibilities, not a checklist.

### Planner priorities
When turning the pool into a draft:
1. fixed bookings and transport constraints;
2. opening/closed days and reservation windows;
3. geographic clustering and route direction;
4. user priority and repeated saves;
5. meal/activity slot fit;
6. avoid unnecessary detours and duplicate experiences.

For meals, default to at most one deliberate destination restaurant per day unless the user explicitly wants a food crawl.

## Visual contract: `ui-brief.json`
Do not mix styling into itinerary facts. Existing confirmed designs are authoritative. Okinawa is locked to the user-approved `gemini-mobile-v1` experience.

For a new trip:
- if the user says to reuse an existing style/runtime, clone its confirmed UI contract;
- if the user asks for a fresh design, use Design Mode.

## Media: `media-brief.json`
Keep media decisions separate from facts. If images are added, use named-place imagery from verifiable sources. Do not use unrelated generic hero images as filler.

## Normal edit workflow

1. Read relevant trip source and UI brief.
2. Classify input: confirmed factual change / discovery share / candidate / task / packing / UI / media.
3. Make the smallest source edit and preserve unrelated content.
4. If discovery input, run the Inbox Mode pipeline before planning.
5. For route changes, keep driving/walking order geographically coherent.
6. Record unresolved facts under uncertainties/verification fields rather than inventing them.
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

## Runtime change rule

Change runtime only for a reusable capability: a generic map component, accessibility fix, discovery-pool view, or new shared itinerary field. A runtime change must not hardcode one destination. Current `gemini-mobile-v1` still contains some optional Okinawa-oriented guide/tool panes; they are feature-gated and should be disabled for unrelated trips until generalized.

## Mobile contract

The deployed site is used on a phone while traveling. Prefer one-tap navigation, visible route context, readable cards, persistent check-off state, and tap targets around 44×44 px or larger. Static inspection is not a substitute for a real browser gate when Playwright is available.

## References

Read only as needed:
- `references/architecture.md` — system boundaries and data flow
- `references/schema.md` — source file contract
- `references/extraction-rules.md` — converting notes/social posts into trip source
- `references/discovery-pool.md` — Inbox Mode, dedupe, enrichment and planning
- `references/design-principles.md` — when a new UI must be designed
