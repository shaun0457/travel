# Source schema

A trip folder separates factual data, discovery evidence, planning drafts, and presentation decisions.

```text
trips/<slug>/
  meta.json
  days/day-N.json
  candidates.json
  tasks.json
  packing.json
  ui-brief.json
  media-brief.json
  discovery/
    config.json
    inbox/<share-id>.json
    places/<place-id>.json
  planning/
    draft-plan.json        # optional agent proposal; never treated as confirmed itinerary
```

## Confirmed trip source
- `meta.json`: schema version + trip-level facts/status/template/features/assumptions/uncertainties.
- `days/day-N.json`: confirmed executable day, route points and itinerary items.
- `candidates.json`: curated shortlist compatible with the current runtime; this is downstream of discovery, not the raw inbox.
- `tasks.json`: booking/pre-trip tasks.
- `packing.json`: checklist items.
- `ui-brief.json`: confirmed visual contract and style policy.
- `media-brief.json`: image/media decisions.

## Discovery inbox record
Raw evidence from Instagram or another shared source. It may be incomplete and must not be scheduled directly.

```json
{
  "schema_version": 1,
  "id": "share-20260917-abc123",
  "status": "received",
  "target_trip": "okinawa",
  "source": {
    "platform": "instagram",
    "url": "https://www.instagram.com/p/...",
    "author": null,
    "shared_at": "2026-09-17T10:00:00Z"
  },
  "raw": {"caption": null, "note": null},
  "extraction": {"state": "pending", "place_ids": [], "errors": []}
}
```

Inbox status: `received | parsing | parsed | needs_review | archived`.

## Discovery place record
One normalized real-world place. Multiple posts may point to the same record.

```json
{
  "schema_version": 1,
  "id": "naha-uraonikai",
  "name": "琉球鮨 うらおにかい",
  "local_name": "琉球鮨うらおにかい",
  "category": "restaurant",
  "area": "Naha / Kumoji",
  "status": "enriched",
  "sources": [{"platform":"instagram","url":"https://www.instagram.com/p/..."}],
  "location": {"address": null, "lat": null, "lng": null, "maps_url": null},
  "planning": {
    "priority": "normal",
    "visit_duration_min": null,
    "meal_slot": "dinner",
    "reservation": "unknown",
    "weather_dependency": "none",
    "scheduled_day": null
  },
  "verification": {
    "needs_verification": ["opening_hours", "closed_days", "reservation"],
    "verified_at": null,
    "notes": []
  }
}
```

Place status: `needs_review | enriched | shortlisted | scheduled | rejected | archived`.

## Planning draft
`planning/draft-plan.json` is an agent proposal generated from confirmed constraints + normalized discovery places. It may be regenerated freely. It must never overwrite `days/` without an explicit promotion instruction from the user.

Every confirmed itinerary item needs a stable `id`, user-facing `time`, `title`, and useful `notes`. Preserve map codes/links when supplied. A folder name and `meta.slug` must match.
