-- One-time wallet activation (Stellar account / USDC trustline XLM reserve)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activation_xlm DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activation_fiat DOUBLE PRECISION NOT NULL DEFAULT 0;
