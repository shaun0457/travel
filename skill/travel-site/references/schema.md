# Source schema

A trip folder separates factual data from presentation decisions.

- `meta.json`: schema version + trip-level facts/status/template/features/assumptions/uncertainties.
- `days/day-N.json`: one day, route points and itinerary items.
- `candidates.json`: saved places not committed to a day.
- `tasks.json`: booking/pre-trip tasks.
- `packing.json`: checklist items.
- `ui-brief.json`: confirmed visual contract and style policy.
- `media-brief.json`: image/media decisions.

Every itinerary item needs a stable `id`, user-facing `time`, `title`, and useful `notes`. Preserve map codes/links when supplied. A folder name and `meta.slug` must match.
