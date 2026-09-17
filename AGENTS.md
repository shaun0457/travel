# Agent entrypoint

Before changing this repository, read `skill/travel-site/SKILL.md` and classify the request into one operating mode: `trip:new`, `trip:update`, `trip:design`, or `trip:inbox`.

## Behaviour contract
1. Interpret user intent and identify the mode.
2. Update the smallest authoritative source under `trips/<slug>/`.
3. Never edit `dist/`; it is generated.
4. Never treat Instagram/social claims as verified real-world facts.
5. Raw inspiration goes to `discovery/inbox.json`; extracted claims go to `discovery/claims.json`; deduplicated places go to `discovery/places/`; planning candidates go to `planning/candidates.json`.
6. Only a PlaceEntity with `planning.planning_ready: true` may automatically influence a draft itinerary.
7. Preserve a locked/confirmed `ui-brief.json`. UI work on locked trips is limited to reusable UX, accessibility and navigation improvements unless the user explicitly asks for redesign.
8. Runtime changes must remain destination-neutral and compatible with all trips using that runtime.
9. Build from source, then verify. Do not hand-maintain generated HTML.
10. Run `npm run verify && npm run build && npm run verify:build`; run the Playwright mobile gate when available.

Lifecycle: `user → structured source → discovery/planning/days → verify → build → dist → GitHub Pages`.
