# Step A — Scaffold, env, and deps

This Next.js 15 + TypeScript + Tailwind app is scaffolded with the required dependencies for the MVP.

Scripts:
- `npm run dev` — start dev server
- `npm run build` — build
- `npm start` — start production server
- `npm run test` — run Vitest
- `npm run e2e` — run Playwright tests

Environment (.env.local):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE
- SENDGRID_API_KEY
- APP_BASE_URL

Run locally:
1. Fill `.env.local` with your keys.
2. Install deps: `npm ci` (or `npm install`).
3. `npm run dev` and open http://localhost:3000.

Note: Git isn't detected on this machine; commits/diffs are shown via patch files in this repo until Git is available.
