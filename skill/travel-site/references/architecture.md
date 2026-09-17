# Architecture

## Product hierarchy

```text
Travel Home
└── Trip Dashboard
    ├── Today
    ├── Itinerary
    ├── Map / Route
    ├── Candidate Pool
    ├── Inbox
    ├── Tasks
    └── Tools / More
```

## Source lifecycle

```text
RAW INSPIRATION              CLEAN PLACE KNOWLEDGE             PLANNED TRAVEL
URL / Instagram / screenshot → CaptureEvent / Claim / Entity → Candidate / Draft → Confirmed Day
       discovery/inbox.json      discovery/claims.json            planning/          days/
                                 discovery/places/
```

Build/runtime lifecycle remains `Trip source → Runtime → Build → dist/ → GitHub Pages`. Generated output is never an authoring surface.

## Boundaries
- `trips/`: facts, discovery, planning, tasks, packing, UI/media contracts.
- `runtime/`: shared presentation/interaction behavior.
- `skill/`: Agent operating policy.
- `scripts/`: deterministic build and verification.
- `dist/`: generated artifact.

`build.mjs` performs PlaceEntity joins before emitting runtime data. A day spot may reference `place_id` instead of duplicating address/contact metadata. Runtime receives resolved data but source remains normalized.
