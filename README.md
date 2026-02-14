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
   - In the SQL Editor, run the migration from `supabase/migrations/00001_init_schema.sql`
   - Copy your Project URL and Service Role Key from Settings → API

3. **Lenco Webhook** (Required for deposit confirmations)
   In your [Lenco Dashboard](https://api.lenco.co), add this webhook URL:
   ```
   https://stepay.vercel.app/api/hooks/lenco
   ```
   Lenco will POST to this endpoint when mobile money payments succeed. Ensure `LENCO_WEBHOOK_SECRET` is set for signature verification.

4. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
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
