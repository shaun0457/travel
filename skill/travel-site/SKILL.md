---
name: travel-site
description: Maintain the source-first, mobile-first travel app framework: create/update trips, capture inspiration, verify places, plan itineraries, improve reusable UX, build and deploy.
---

# Travel Site Skill

This repository is a **stable runtime + structured trip source + discovery/planning pipeline + generated output** system. The deployed product is used on a phone while travelling. Preserve the user-approved `gemini-mobile-v1` blue/white visual language unless a redesign is explicitly requested.

## Non-negotiable architecture

```text
Trip source
  ↓
Runtime
  ↓
Build
  ↓
dist/
  ↓
GitHub Pages
```

- `trips/<slug>/` is the source of truth.
- `runtime/<id>/` is reusable product code, never a destination-specific data store.
- `dist/` is disposable generated output. Never hand-edit it.
- Source facts, discovery evidence, planning drafts, UI contracts and media decisions remain separated.
- Keep existing Day data, Tasks, Packing, Candidates, local progress, Share/QR, currency and emergency capabilities during migrations.

## Four operating modes

### `trip:new`
Create a new trip. Establish `trips/<slug>/`, standard source files, reuse an approved runtime/UI contract when requested, verify, build and deploy. A new destination does not justify a new runtime.

### `trip:update`
Modify an existing trip. Edit only the smallest necessary source, normally one day/task/packing/planning file. Never edit generated HTML.

### `trip:design`
Improve reusable UI/UX. If `ui-brief.json` is locked/confirmed, visual language is immutable: only UX, accessibility, navigation, progressive disclosure and reusable capabilities may change. Only explicit redesign intent unlocks visual redesign.

### `trip:inbox`
Process Instagram, URLs, screenshots or other inspiration through the gated pipeline:

```text
CaptureEvent → Claim → PlaceEntity → verification → Candidate Pool → draft planner → confirmed itinerary
```

The original URL is always retained. A social post is evidence, not truth.

## Three information layers

1. **Raw Inspiration** — `discovery/inbox.json` (`CaptureEvent`).
2. **Clean Place Knowledge** — `discovery/claims.json` + `discovery/places/<place-id>.json` (`PlaceEntity`).
3. **Planned Travel** — `planning/candidates.json`, `planning/draft-plan.json`, then explicit promotion to `days/day-N.json`.

Root `candidates.json` is a backwards-compatible fallback only. New work writes `planning/candidates.json`.

## Planning-ready gate

Never schedule a place merely because a post mentioned it. Only `planning.planning_ready: true` may automatically enter a draft.

Minimum verification:
- Restaurant: identity, navigable location/area, opening day constraints, meal slot.
- Attraction: identity, navigable location, opening constraints, estimated duration.
- Activity: attraction requirements plus meeting point/location, reservation requirement and weather dependency.

If evidence is missing or conflicting, preserve the uncertainty and keep `planning_ready: false`.

## Navigation-first mobile contract

For every itinerary place with location data:
- primary CTA is **Google 地圖導航**;
- destination priority is `lat/lng → address → maps_query → title`;
- navigation sheet offers Google Maps, Apple Maps, copy address and share;
- minimum interactive target is approximately 44×44 px;
- do not disable a whole card when an address is incomplete; show the unresolved state.

Day screens prioritize: current context → next stop → route summary → itinerary. Large maps must not consume the initial mobile viewport. Use progressive disclosure for notes and details. The five primary tabs are `今日 / 行程 / 收藏 / 待辦 / 更多`.

## Local state rule

LocalStorage may persist progress/UI state only: visited, tasks, packing, current trip/day, last viewed tab, dismissed recommendations and device-local candidate additions. Repository source remains authoritative for itinerary facts.

## Normal workflow

1. Read relevant trip source + `ui-brief.json`.
2. Identify the operating mode.
3. Make the smallest source edit.
4. For inbox input: preserve raw source → extract claims → resolve/dedupe → verify → set planning-ready → candidate/draft.
5. Preserve confirmed days unless the user explicitly promotes a draft.
6. Run `npm run verify`, `npm run build`, `npm run verify:build`.
7. When Playwright is available, run `npm run verify:mobile -- dist/<slug>/index.html`.
8. Only then merge/deploy.

## References
- `references/architecture.md`
- `references/schema.md`
- `references/extraction-rules.md`
- `references/discovery-pool.md`
- `references/design-principles.md`
