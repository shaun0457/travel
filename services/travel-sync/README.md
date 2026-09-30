# Travel Sync Worker

Small Cloudflare Worker + D1 service for device-to-device travel progress sync.

## What is synced

Only mutable user progress:
- `task` done state
- `packing` checked state
- `spot` visited state

Trip content, restaurants, dates, notes and UI remain source-controlled under `trips/<slug>/` and continue to deploy through GitHub Pages.

## Security model

The public GitHub Pages bundle contains no GitHub token and no fixed sync secret. Each travel group gets a random capability token generated in the browser. The token is stored in localStorage and included only in the interactive share URL fragment (`#...&sync=...`). URL fragments are not sent to GitHub Pages. The Worker receives the token as a Bearer token, hashes it with SHA-256, and D1 stores only that hash.

Anyone who receives an interactive share link can join that shared travel state, so treat that link like a private invitation. The clean share URL does not carry the sync token.

## One-time Cloudflare setup

1. Install/authenticate Wrangler locally, or use Cloudflare's dashboard/CLI.
2. Create the database:
   `npx wrangler d1 create travel-state`
3. Copy the returned database ID into `wrangler.jsonc` in place of `__D1_DATABASE_ID__`.
4. Apply the schema:
   `npx wrangler d1 execute travel-state --remote --file=schema.sql`
5. Deploy from this directory:
   `npx wrangler deploy`
6. Copy the resulting `https://<worker>.workers.dev` URL into the trip meta:

```json
"sync": {
  "enabled": true,
  "apiBase": "https://<worker>.workers.dev"
}
```

For Okinawa that setting belongs inside `trips/okinawa/meta.json` under `meta`.

## API

- `GET /health`
- `GET /v1/state?trip_id=okinawa`
- `POST /v1/state/mutations`

State writes are item-level and last-write-wins per item using the client mutation timestamp, so two devices changing different checklist items do not overwrite each other.
