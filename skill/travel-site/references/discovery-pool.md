# Discovery Pool / Inbox Mode

Use this mode for Instagram posts, Reels, map links, screenshots, blogs, or other travel inspiration.

## Goal
Turn noisy saved content into a deduplicated, evidence-backed place pool without destabilizing confirmed itinerary days.

## Canonical pipeline

```text
CaptureEvent
  discovery/inbox.json
        ↓ extraction
Claim
  discovery/claims.json
        ↓ identity resolution + dedupe
PlaceEntity
  discovery/places/<place-id>.json
        ↓ verification + planning_ready gate
Candidate Pool
  planning/candidates.json
        ↓ route / constraint / priority planning
Draft
  planning/draft-plan.json
        ↓ explicit promotion
Confirmed itinerary
  days/day-N.json
```

`discovery/inbox/` remains readable only for legacy compatibility. New intake writes `discovery/inbox.json`. Root `candidates.json` remains a legacy fallback; new planning work uses `planning/candidates.json`.

## Intake behavior
- Preserve the original source URL first.
- A social post is evidence, not a real-world fact.
- One post may contain zero, one, or many places; multiple posts may refer to the same PlaceEntity.
- Inaccessible or ambiguous content stays `needs_review`; never guess missing identity or logistics.
- Batch intake is allowed without forcing an immediate scheduling decision.

## Claims and verification
Extract caption/image/text statements as Claims. Planning-critical changing facts must be verified before they can drive a dated itinerary: identity, navigable location, opening/closed days, reservation/ticket requirements, weather dependency, estimated duration, and meal slot when relevant.

A PlaceEntity may set `planning.planning_ready: true` only after its category-specific gate is satisfied. Conflicting or stale facts remain visible and keep the place out of automatic planning.

## Deduplication
Prefer, in order:
1. exact official/maps identity or coordinates;
2. normalized local/Japanese/English name + area;
3. address or phone;
4. high-confidence semantic match.

When uncertain, keep separate PlaceEntities and flag the possible duplicate rather than merging aggressively.

## Planner behavior
Recommendations must be explainable and based on geography, current day route, opening constraints, meal density, reservation state, weather dependency, and user priority. Saved does not mean scheduled.

The default is draft-first replanning. New saves may update `planning/draft-plan.json`, but confirmed `days/` only change after explicit promotion such as `排進去`, `套用這版`, or `更新正式行程`, unless the user explicitly delegates automatic promotion.
