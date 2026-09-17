# Travel

個人旅行網站與 Agent 工作區。GitHub Pages: https://shaun0457.github.io/travel/

## 核心原則

- `trips/<slug>/` 是旅行資料的唯一 source of truth。
- `runtime/` 是穩定 UI/runtime；不要為單一景點直接改 runtime。
- `skill/travel-site/SKILL.md` 是所有 Agent 的操作規範。
- `dist/` 是 build 產物，不提交、不手改。
- 既有旅程若 `ui-brief.json` 鎖定版型，除非使用者明確要求 redesign，否則必須保留。

## 指令

```bash
npm run verify
npm run build
npm run verify:build
```

目前旅程：
- Okinawa 2026 → `/okinawa/`
