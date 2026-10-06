# Aqua-API — by AjiroDesu

Fast, friendly REST API playground (canvas memes, random media, AI images) with interactive docs and an admin dashboard modeled on the Persian-Bot admin.

> 📖 **Full guide & tutorial (every feature, every page, with screenshots): [`GUIDE.md`](GUIDE.md)**

## Run locally

```bash
npm install

# 1. Backend env (packages/aqua/.env is gitignored — create it):
#    API_KEY=<random-secret>   # doubles as the admin registration setup key
#    PORT=3000

# 2. Start both servers (two terminals):
npm run dev -w aqua     # backend  → http://localhost:3000
npm run dev:web         # frontend → http://localhost:5173  (proxies /api/* to :3000)
```

Open the docs at http://localhost:5173/docs and the admin at http://localhost:5173/admin — pick Register on the login panel and enter the API_KEY as the setup key to create the first admin account. Passwords are stored as scrypt hashes only.

Production build served by Express itself:

```bash
npm run build   # builds web, then aqua
npm start       # serves API + frontend on PORT
```

## Admin dashboard

Routes: `/admin` (login), `/admin/dashboard` (overview), `/stats`, `/endpoints`, `/logs`, `/settings` — all lazy-loaded, token-gated, mobile drawer included.

Backend contract (`GET/POST/PATCH/DELETE /api/admin/*`, Bearer token, `{ error }` on failure) is mirrored in `packages/web/src/lib/adminTypes.ts`; the backend source of truth is `packages/aqua/src/engine/admin-router.ts`. The only account in the system is the admin (env credentials) — there are no managed user accounts.

Key behaviors:

- Stats page (`/admin/dashboard/stats`): complete traffic stats — totals, per-source and per-status breakdowns, top routes, 24h activity.
- IP Checker: `GET/POST /tools/ipcheck?ip=` endpoint plus a lookup card on the docs overview.
- Disabling an endpoint (`PATCH /api/admin/endpoints`) makes it answer `404` immediately, no restart.
- Maintenance mode (`PUT /api/admin/settings { maintenance: true }`) pauses the public API with `503`; admin, `/api/health`, and the site stay up.
- Logs stream over SSE (`GET /api/admin/logs/stream?token=…`).

## Database (Neon or instant fake)

Aqua stores admin state (maintenance flag, disabled endpoints) and
notifications in a database with one interface and two adapters
(`packages/aqua/src/db/`, same `pg`-Pool logic as Persian-Bot's neondb):

- **Fake (default):** memory backed by `packages/aqua/src/json/fakedb.json`.
  Zero setup — the server boots instantly with no credentials. A welcome
  notification is seeded on first run.
- **Neon:** set `NEON_DATABASE_URL` (or `DATABASE_URL`) to switch to Neon
  Postgres. Schema (`aqua_kv`, `aqua_notifications`) is created
  automatically at boot. Get a free project at https://neon.tech.

The dashboard shows the active adapter (`neon` / `fake`) on the Stats page.

## Deploy to Render

1. Push this repo to GitHub.
2. Create a **Web Service** → build command `npm install && npm run build`, start command `npm start`.
3. Set environment variables (see `packages/aqua/.env.example`): `NODE_ENV=production`, `PORT` (Render injects it — honored automatically), `API_KEY` (random secret — also the admin setup key), plus any endpoint keys you use.
4. Deploy — the service serves API + frontend + admin from one process; no static-site setup needed.
