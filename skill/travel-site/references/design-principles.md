# Design principles

Existing confirmed/locked UI wins. `gemini-mobile-v1` keeps its sky-blue, white-card, rounded, subtle-shadow, lightweight visual language unless the user explicitly requests redesign.

## Mobile travel hierarchy
1. Primary action (navigation / next stop)
2. Current context (today/day/route)
3. Travel information
4. Secondary metadata

Use progressive disclosure: collapsed itinerary cards show time, title, core context and navigation; details reveal address, hours, reservation, notes, source and map preview. Avoid desktop-first dashboards, large above-the-fold maps, small tap targets, excessive colored buttons and showing everything simultaneously.

Primary controls should be about 44×44 px or larger. Bottom navigation has at most five destinations: `今日 / 行程 / 收藏 / 待辦 / 更多`. Destination-specific utilities belong under More rather than becoming global tabs.

For a truly new visual direction, only after explicit redesign intent, produce materially distinct options (`sensory`, `editorial`, `navigator`) and lock the selected contract before production work.
