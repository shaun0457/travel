# Architecture

The system has two responsibilities: guide an Agent through a gated travel-site workflow, and keep a stable runtime that can render many trips from data.

## Data flow

`user notes → structured trip source → UI/media briefs → verify → build → dist → GitHub Pages`

Runtime stays destination-neutral. New trips should change source data, UI tokens, media, and copy—not the page skeleton. Generated output is never the authoring surface.

## Boundaries

- `trips/`: user intent and travel facts.
- `runtime/`: shared presentation and interaction behavior.
- `skill/`: Agent operating policy.
- `scripts/`: deterministic build/verification.
- `dist/`: disposable artifact.

When adding a capability, prefer extending the source schema or shared runtime rather than introducing a second one-off page implementation.
