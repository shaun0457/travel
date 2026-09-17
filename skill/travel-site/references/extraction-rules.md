# Extraction rules

- Preserve exact times and vague time labels; never invent precision.
- Preserve user-provided display names, links, captions, and notes.
- If a place is optional, keep it outside confirmed days until explicitly promoted.
- Include logistics that make the day executable: airport/drive/check-in/return legs where relevant.
- Keep route order geographically coherent; expose assumptions rather than hiding them.
- Treat closure hours, reservations, weather/sea conditions, and unconfirmed bookings as uncertainties when not verified.
- Do not turn a saved-place list into a checklist that must all be visited.

## Instagram / social-share extraction

1. Preserve the original post URL first; this is evidence, not truth.
2. One post may contain zero, one, or many real-world places. Keep it in `discovery/inbox/` until resolved.
3. If the post cannot be read publicly, do not guess. Use user-shared caption/text/screenshot if available; otherwise mark `needs_review`.
4. Normalize the real place into `discovery/places/`; deduplicate by canonical place identity, not by post URL.
5. Multiple posts about the same place append to `sources[]`; do not create duplicate place records.
6. Separate claims from verified planning facts. Instagram-derived opening hours, closed days, reservation rules, prices, and addresses remain unverified until corroborated when they matter to scheduling.
7. Only normalized place records may enter planning. Raw inbox records never enter `days/` directly.
8. When a place is scheduled, preserve its discovery sources for provenance and set `planning.scheduled_day`.
