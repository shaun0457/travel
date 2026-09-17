# Extraction rules

- Preserve exact user-provided times, names, URLs, captions and notes.
- Never invent precision or silently turn uncertainty into fact.
- Keep optional places outside confirmed days until explicitly promoted.
- Keep route order geographically coherent and preserve executable logistics.

## Social / URL extraction
1. Write the raw share to `discovery/inbox.json` first and retain the original URL.
2. Extract statements into `discovery/claims.json`; captions/image text are claims, not verified facts.
3. Resolve real-world identity and deduplicate into `discovery/places/<place-id>.json`.
4. Multiple shares about one place append provenance; do not create duplicate PlaceEntities.
5. Verify planning-critical changing facts from suitable current sources: identity/location, opening/closed days, reservation/tickets, weather dependency, duration and meal slot when relevant.
6. Record verification status/time and conflicts. If inaccessible or ambiguous, use `needs_review` instead of guessing.
7. Set `planning.planning_ready: true` only after the category-specific gate is satisfied.
8. Only then promote to `planning/candidates.json` or a draft. Raw inbox/claims never enter `days/` directly.
