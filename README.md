# Stepay - Stellar Mobile Money Platform

A "Real" application for buying and selling Stellar Lumens (XLM) using Mobile Money (Lenco API).

## Prerequisites
- Node.js 18+
- PostgreSQL 13+ (local, [Neon](https://neon.tech), RDS, etc.)
- Lenco API (Secret Key + Account ID)
- Stellar Account (for Platform Hot Wallet)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   *Note: If you encounter `ENOSPC` (No space left on device) errors, try clearing npm cache or freeing disk space.*

2. **Database**
   - Set `DATABASE_URL` in `.env` (see `env.example`). Local default: `postgresql://postgres:postgres@127.0.0.1:5432/stepay`.
   - **Local Postgres (Windows):** install [PostgreSQL 17+](https://www.postgresql.org/download/windows/), then:
     ```bash
     npm run db:start   # init/start server in .pgdata/
     npm run db:setup   # create DB + apply db/migrations/*.sql
     ```
   - Or run migrations manually from [`db/migrations/`](db/migrations/) via `psql`.

3. **Authentication (Auth.js)**
   - Set `AUTH_SECRET` (e.g. `openssl rand -base64 32`) and `AUTH_URL` to your site origin (e.g. `https://stepay.vercel.app` in production, `http://localhost:3000` locally).
   - Email/password accounts store `password_hash` in the `users` table. Password reset uses `password_reset_tokens`; if `RESEND_API_KEY` is not set, the reset link is logged on the server for development.
   - **Vercel**: Add `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` under Project → Settings → Environment Variables.

4. **Lenco Webhook** (Optional but recommended for instant deposit confirmations)
   - Add this webhook URL in Lenco Dashboard (contact [Lenco support](mailto:support@lenco.co) if needed):
     ```
     https://stepay.vercel.app/api/hooks/lenco
     ```
   - Verify it's reachable: open `https://stepay.vercel.app/api/hooks/lenco` in a browser – you should see `{"ok":true,...}`.
   - Set `LENCO_WEBHOOK_SECRET` in Vercel env vars: use `SHA256(LENCO_SECRET_KEY)` as hex, or the value Lenco provides.
   - **Fallback**: If the webhook is not configured, a cron job runs every 2 minutes to poll Lenco and complete approved deposits. Set `CRON_SECRET` (e.g. `openssl rand -hex 32`) in Vercel to secure the cron endpoint.

5. **Environment Variables**
   Copy [`env.example`](env.example) to `.env` and fill in values.

6. **Run Development Server**
   ```bash
   npm run dev
   ```

## Features implemented
- **Landing Page**: Modern, responsive design.
- **Dashboard**: User balance and quick actions.
- **Buy XLM**: Integrated with Lenco Collection API.
- **Sell XLM**: Deposit address generation and Payout handling.
- **Backend Services**: Robust wrappers for Lenco and Stellar SDK.
- **Database**: PostgreSQL (users, transactions, platform settings) with direct access via [`postgres`](https://github.com/porsager/postgres).
- **Auth**: [Auth.js](https://authjs.dev/) (NextAuth v5) with credentials and JWT sessions.
