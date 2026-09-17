# Agent entrypoint

Before changing this repository, read `skill/travel-site/SKILL.md`.

Rules:
1. Edit `trips/<slug>/` for trip facts, discovery items, planning drafts, tasks, and UI contracts. Do not edit deployed HTML.
2. For Instagram/social saves, use **Inbox Mode**: raw shares go to `trips/<slug>/discovery/inbox/`; normalized verified places go to `trips/<slug>/discovery/places/`.
3. Never schedule a raw inbox record directly. Normalize, deduplicate, and verify planning-critical facts first.
4. Respect `ui-brief.json`; a locked/confirmed design is preserved unless the user explicitly requests redesign.
5. Treat `runtime/` as shared product code. Runtime changes must be compatible with every trip that uses it.
6. Never edit `dist/`; it is generated.
7. Run `npm run verify && npm run build && npm run verify:build` before merging or deploying.
