# Agent entrypoint

Before changing this repository, read `skill/travel-site/SKILL.md`.

Rules:
1. Edit `trips/<slug>/` for trip facts, not deployed HTML.
2. Respect `ui-brief.json`; a locked/confirmed design is preserved unless the user explicitly requests redesign.
3. Treat `runtime/` as shared product code. Runtime changes must be compatible with every trip that uses it.
4. Never edit `dist/`; it is generated.
5. Run `npm run verify && npm run build && npm run verify:build` before merging or deploying.
