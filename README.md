# Sayro Web — Real Estate Portal (Next.js)

This is a Next.js 13 app for a real estate portal with an admin area, EasyBroker integration, lead tracking, optional Turso (libSQL) database, and utilities for Meta Ads creatives. A local SQLite setup is supported for fast development.

## Quick Start

- Node.js: 18 or 20 recommended
- Package manager: npm or yarn (do not mix). This repo contains both `yarn.lock` and `package-lock.json`; pick one and stick to it.

```
# 1) Install deps
npm install   # or: yarn

# 2) Create your env file
cp .env.example .env.local
# Edit .env.local and fill required values (see below)

# 3) Generate Prisma client
npm run prisma:generate

# 4) (Optional) Prepare DB schema SQL (for Turso users)
npm run db:sql

# 5) (Optional) Deploy schema to Turso (requires TURSO_* env)
npm run db:deploy:turso

# 6) (Optional) Seed properties from EasyBroker (requires EASYBROKER_API_KEY)
npm run db:seed

# 7) Create admin user (uses ADMIN_USERNAME/PASSWORD)
npm run db:create-admin

# 8) Run dev server
npm run dev
```

Visit http://localhost:3000

## Environment Variables

Create `.env.local` from `.env.example` and fill as needed.

- Database
  - `DATABASE_URL` (default local SQLite: `file:./prisma/dev.db`)
  - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (optional; use instead of SQLite)
- Admin & session
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (used by `db:create-admin`)
  - `SESSION_PASSWORD` (min 32 chars; generate with `openssl rand -base64 48`)
- Integrations
  - `EASYBROKER_API_KEY` (for seeding/sync and some runtime fetch)
  - `GOOGLE_MAPS_API_KEY` (server-side geocode route)
  - `META_GRAPH_VERSION` (default `v19.0`), `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID`
- Public site
  - `SITE_BASE_URL`, `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_WA_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_FB_PIXEL_ID`
  - `NEXT_PUBLIC_PHONE_SCHEME` (admin call buttons default: `tel` | `sip` | `callto`)
- EgoRealEstate scraper (optional)
  - `EGO_USER`, `EGO_PASS`, `EGO_HEADLESS`

Notes:
- Local/dev uses SQLite by default. The code normalizes `file:` paths to absolute to avoid `Unable to open the database file` issues when the runtime cwd changes.
- If using Turso/libSQL, set `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`. The Prisma client will automatically use the LibSQL adapter.

## Useful Scripts

- `dev` — Next dev server
- `build` / `start` — Next production build & start
- `prisma:generate` — Generate Prisma client
- `db:sql` — Generate SQL script from Prisma schema
- `db:deploy:turso` — Apply schema SQL to Turso via libSQL
- `db:seed` — Seed DB with EasyBroker properties (needs `EASYBROKER_API_KEY`)
- `db:create-admin` — Create or update the admin user using env credentials
- `ego:scrape` — Scrape properties/contacts to DB (see `src/ego` and `tools/ego-scraper`)

## Project Structure

- `src/pages` — Next pages (site + admin + API routes)
- `src/components` — UI components
- `src/lib` — Prisma, sessions, integrations (EasyBroker, Meta, site config)
- `src/ego` — Local scraping scripts (Node/Playwright)
- `prisma/` — Prisma schema, seed, helpers
- `public/` — Static assets
- `vercel-app/` — A separate app folder kept for reference; main app lives at repo root.

## Notes & Tips

- Choose one package manager (npm or yarn) to avoid lockfile conflicts.
- For production, ensure `SESSION_PASSWORD` is long and random and `NODE_ENV=production`.
- If you see 401 on admin APIs, make sure you have created the admin user and are signed in via `src/pages/admin/login.tsx`.
- Images from EasyBroker are whitelisted in `next.config.js`.

## Troubleshooting

- Database file errors (SQLite): ensure `DATABASE_URL=file:./prisma/dev.db` and that the `prisma` folder exists. The code auto-normalizes relative `file:` URLs to an absolute path at runtime.
- Turso schema not applied: run `npm run db:sql` then `npm run db:deploy:turso` with `TURSO_*` envs set.
- Seeding failures: confirm `EASYBROKER_API_KEY`, internet access, and see `prisma/seed-errors.log` after a run.
