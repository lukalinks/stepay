# AGENTS.md

## Cursor Cloud specific instructions

**Stepay** is a Next.js 16 (App Router) crypto on/off-ramp web app for Zambia (XLM/USDC via Mobile Money). Single service — no Docker, no monorepo.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Build | `npm run build` |
| Lint | `npx eslint .` |
| Health check | `curl http://localhost:3000/api/health` |

### Environment variables

Copy `env.example` to `.env` and fill in values. For local dev without real backends, placeholder values work — the app builds and renders all pages. Auth/transaction flows require real Supabase + Lenco + Stellar credentials (see `env.example` for the full list).

### Gotchas

- **No test suite**: The repo has no automated tests (no Jest, Vitest, or Playwright). Lint (`npx eslint .`) is the only static check. Pre-existing lint errors exist in `lib/lenco.ts`, `lib/stellar.ts`, and several API routes.
- **Next.js 16 middleware deprecation**: `middleware.ts` triggers a build warning ("middleware" is deprecated, use "proxy"). This is cosmetic and does not break anything.
- **External services**: Supabase (DB + Auth), Lenco (mobile money), and Stellar Horizon are all external hosted APIs — no local databases or containers to run. The app gracefully falls back to placeholder values during build.
