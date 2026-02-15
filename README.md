# Stepay - Stellar Mobile Money Platform

A "Real" application for buying and selling Stellar Lumens (XLM) using Mobile Money (Lenco API).

## Prerequisites
- Node.js 18+
- Supabase account
- Lenco API (Secret Key + Account ID)
- Stellar Account (for Platform Hot Wallet)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   *Note: If you encounter `ENOSPC` (No space left on device) errors, try clearing npm cache or freeing disk space.*

2. **Supabase Setup**
   - Create a project at [supabase.com](https://supabase.com)
   - In the SQL Editor, run migrations in order: `00001_init_schema.sql` then `00002_add_email_auth.sql`
   - Copy Project URL, anon key, and Service Role Key from Settings → API
   - For password auth: Supabase → Auth → Providers → Email — ensure "Confirm email" is off if you want immediate sign-in for new users
   - For forgot password: Supabase → Auth → URL Configuration — add your site URL (e.g. `https://stepay.vercel.app`) and `https://stepay.vercel.app/reset-password` to Redirect URLs
   - **Vercel**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Project → Settings → Environment Variables (the anon key is sometimes named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in Supabase—both work)

3. **Lenco Webhook** (Optional but recommended for instant deposit confirmations)
   - Add this webhook URL in Lenco Dashboard (contact [Lenco support](mailto:support@lenco.co) if needed):
     ```
     https://stepay.vercel.app/api/hooks/lenco
     ```
   - Verify it's reachable: open `https://stepay.vercel.app/api/hooks/lenco` in a browser – you should see `{"ok":true,...}`.
   - Set `LENCO_WEBHOOK_SECRET` in Vercel env vars: use `SHA256(LENCO_SECRET_KEY)` as hex, or the value Lenco provides.
   - **Fallback**: If the webhook is not configured, a cron job runs every 2 minutes to poll Lenco and complete approved deposits. Set `CRON_SECRET` (e.g. `openssl rand -hex 32`) in Vercel to secure the cron endpoint.

4. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"   # Required for email magic link auth
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

   # Lenco Mobile Money (https://api.lenco.co/access/v2)
   LENCO_SECRET_KEY="your_lenco_secret_key"
   LENCO_ACCOUNT_ID="your_lenco_account_uuid"
   LENCO_API_URL="https://api.lenco.co/access/v2"   # optional, this is default

   # Stellar Mainnet
   PLATFORM_WALLET_SECRET="S..."          # Secret key for the hot wallet distributing XLM
   PLATFORM_WALLET_PUBLIC_KEY="G..."
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## Features implemented
- **Landing Page**: Modern, responsive design.
- **Dashboard**: User balance and quick actions.
- **Buy XLM**: Integrated with Lenco Collection API.
- **Sell XLM**: Deposit address generation and Payout handling.
- **Backend Services**: Robust wrappers for Lenco and Stellar SDK.
- **Database**: PostgreSQL via Supabase (Users and Transactions).
