# Discovery Pool / Inbox Mode

Use this mode when the user shares Instagram posts, Reels, map links, screenshots, blog posts, or other saved travel inspiration.

## Goal
Turn a noisy stream of saved content into a deduplicated, evidence-backed place pool that can continuously feed itinerary planning without destabilizing confirmed days.

## Data flow

```text
Instagram/share/link/screenshot
        ↓
 discovery/inbox/       raw evidence
        ↓ parse + identify
 discovery/places/      normalized real-world entities
        ↓ enrich + verify planning-critical facts
 shortlist / planner
        ↓
 planning/draft-plan.json
        ↓ explicit promotion
 days/day-N.json
```

## Intake behavior
- If the target trip is obvious from conversation, use it. Otherwise ask only for the target trip, not for day/time.
- Preserve every source URL before enrichment.
- Batch intake is allowed: process many shared posts without forcing a planning decision after each one.
- If a post is inaccessible, keep it as `needs_review`; never discard it and never hallucinate the place.

## Normalization & deduplication
Match likely duplicates using, in order:
1. exact Maps/official URL or coordinates;
2. normalized local/English/Japanese place name + area;
3. address/phone where available;
4. high-confidence semantic match.

When uncertain, keep separate records and flag possible duplicates rather than merging aggressively.

## Enrichment gate
Before a place can influence a dated itinerary, verify the facts that materially constrain scheduling:
- location/address;
- opening days and closures;
- time-sensitive opening hours when relevant;
- reservation/ticket requirements;
- weather/sea dependency for activities;
- approximate visit duration and meal slot when needed.

Use current public sources for facts that can change. Record `verified_at` and keep unresolved items visible.

## Planner behavior
The default policy is **draft-first auto replan**:
- after an intake batch, update `planning/draft-plan.json` when trip dates/areas are known;
- cluster by geography and route direction;
- respect lodging, transport, opening days, bookings, and fixed events;
- score saved places instead of trying to consume all of them;
- avoid more than one deliberate destination restaurant per day unless the user explicitly wants a food crawl;
- keep backups for weather-dependent activities;
- do not mutate confirmed `days/` merely because a new post arrived.

Promotion to confirmed days happens only when the user says things like `排進去`, `套用這版`, `更新正式行程`, or has explicitly delegated automatic promotion.

## Suggested place scoring
A planner may use a simple explainable score rather than a black box:
- user priority / repeated saves: +3
- geographically on-route: +2
- fills an empty meal/activity slot: +2
- reservation already secured: +2
- unique / high-fit experience: +1
- major detour: -3
- conflicts with closure/time window: -5
- duplicates an already scheduled experience: -2

Always surface why a high-scoring place was selected or rejected when the choice is non-obvious.
