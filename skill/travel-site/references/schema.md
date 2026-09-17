# Source schema

```text
trips/<slug>/
  meta.json
  days/day-N.json
  discovery/
    inbox.json
    claims.json
    places/<place-id>.json
    inbox/                  # legacy per-share records; read-only compatibility
  planning/
    candidates.json
    draft-plan.json
  candidates.json           # legacy fallback
  tasks.json
  packing.json
  ui-brief.json
  media-brief.json
```

## CaptureEvent — `discovery/inbox.json`

```json
{
  "schema_version": 1,
  "events": [{
    "event_id": "capture_20260917_001",
    "source": {"platform":"instagram","url":"https://...","author":null},
    "captured_at": "2026-09-17T18:20:00+08:00",
    "trip_hint": "okinawa",
    "user_note": "這間看起來很猛",
    "attachments": [],
    "status": "received"
  }]
}
```

Allowed status: `received | processing | needs_review | processed | duplicate | rejected`. Original source URL is immutable evidence.

## Claim — `discovery/claims.json`

```json
{
  "schema_version": 1,
  "claims": [{
    "claim_id":"claim_001",
    "event_id":"capture_20260917_001",
    "field":"opening_hours",
    "value":"17:00–23:00",
    "source_type":"instagram_caption",
    "confidence":0.72,
    "verification":{"status":"unverified","verified_at":null}
  }]
}
```

Verification: `unverified | verified | conflicting | stale`.

## PlaceEntity — `discovery/places/<place-id>.json`

```json
{
  "schema_version": 1,
  "place_id": "naha_uraonikai",
  "identity": {"name":"琉球鮨 うらおにかい","local_name":"琉球鮨うらおにかい","aliases":[]},
  "category": "restaurant",
  "location": {"country":"Japan","prefecture":"Okinawa","city":"Naha","area":"Kumoji","address":null,"lat":null,"lng":null,"maps_query":null},
  "contact": {"phone":null,"website":null,"reservation_url":null},
  "planning": {"planning_ready":false,"priority":"normal","duration_min":90,"meal_slots":["dinner"],"weather_dependency":"none"},
  "constraints": {"reservation":"unknown","closed_days":[],"opening_hours":null},
  "sources": [],
  "verification": {}
}
```

Legacy place fields (`id`, `name`, `area`) remain readable during migration, but new writes use the schema above.

## Day spot
Required fields remain `id`, `time`, `title`, `notes`. Optional reusable fields: `place_id`, `location`, `contact`, `duration_min`, `transport_to_next`, `visited`. When `place_id` exists, build resolves PlaceEntity metadata and spot-level values override joined defaults.

## Candidate Pool
`planning/candidates.json` is authoritative when present; root `candidates.json` is the fallback. A candidate may embed presentation fields or reference `place_id`. Only planning-ready PlaceEntities may be automatically proposed by an Agent.
