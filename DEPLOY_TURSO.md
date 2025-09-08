Deploy a Vercel + Prisma app to Turso

Prereqs
- Node 18+, Yarn/NPM, Vercel project configured
- Turso account and CLI (optional)

Steps
- Create a Turso database and obtain the connection URL and auth token.
- In Vercel Project Settings → Environment Variables, add:
  - TURSO_DATABASE_URL
  - TURSO_AUTH_TOKEN
  Do not set DATABASE_URL in Vercel (it is only for local SQLite).
- Prepare schema on Turso (run locally):
  - yarn db:sql
  - export TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=…
  - yarn db:deploy:turso
- Optional: seed the remote DB (will use Turso if TURSO_* are set locally):
  - yarn db:seed
- Deploy:
  - git push to Vercel or vercel --prod

Notes
- The app auto-selects Turso in production when TURSO_DATABASE_URL is present.
- Prisma Client is generated on install via postinstall.
- Local development continues to use SQLite at DATABASE_URL=file:./prisma/dev.db

