# Travel

Personal travel planning repository built around a **structured source → agent planning → deterministic build → GitHub Pages** workflow.

## Core model

- `trips/<slug>/` — source of truth for each trip
- `trips/<slug>/discovery/` — saved-post inbox and normalized discovery pool
- `trips/<slug>/planning/` — agent-generated draft plans before promotion to confirmed days
- `runtime/` — stable reusable UI
- `skill/travel-site/` — operating rules for ChatGPT / Codex / Claude Code
- `scripts/` — deterministic intake, validation and build tools
- `dist/` — generated output, never hand-edit

## Common workflows

### Start a trip
Tell an agent: `新增一趟京都旅行，2027/4/3–4/8，2 人，沿用 Okinawa UI。`

### Save an Instagram post
Share/paste the Instagram URL to the agent and say: `收進 Okinawa pool。`

The agent should:
1. preserve the raw share in `discovery/inbox/`;
2. identify/deduplicate the real place;
3. verify planning-critical facts when needed;
4. write/update a normalized record in `discovery/places/`;
5. refresh `planning/draft-plan.json` when enough information exists;
6. leave confirmed `days/` unchanged until explicitly promoted.

CLI raw intake is also available:
```bash
npm run inbox:add -- okinawa "https://www.instagram.com/p/..." "optional note"
npm run pool:list -- okinawa
```

## Validation

```bash
npm run verify
npm run build
npm run verify:build
```

GitHub Actions performs the same source-first build before Pages deployment.

`verify:build` also compares generated itinerary, candidates, tasks and packing with
the authoritative source. The mobile gate checks every rendered day, candidate
card, Google navigation destination and preservation of saved device progress.
After deployment, use the same gate against the public URL and deployed commit:

```bash
npm run verify:mobile -- https://shaun0457.github.io/travel/tokyo/ <deployed-commit-sha>
```

This public check requires a local verified build and Playwright. It compares the
live data with that build, verifies HTTP 200 and checks both asset version tags.

## Editable schedule on your phone

Each stop offers **調整時間 / 順序** (date, start time, flexible time, insertion position, or move up/down) and **移至收藏**. Favorites offer **安排時間 / 加入行程** and reopen an existing scheduled stop instead of duplicating it. Time changes default to chronological order; an explicit position preserves other stops’ times. The last schedule change can be undone.

The v13 device state stores source-ID overrides, candidate placements and per-day order separately from repository facts. Moving a source stop into Saved retains its latest notes, address and progress; adding it back preserves its identity. Existing v12 state is migrated, including candidate times. Reloads, new deployments and interactive share links preserve these changes. This is device-local storage; the existing remote boolean-progress sync does not synchronize schedule edits. Editing an itinerary time does not change a real reservation. Original route diagrams and transport estimates are hidden after the stop sequence changes, because they no longer describe the edited route.

After building, run `npm run verify:schedule` for the schedule/state migration regression gate (both trips).
