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
