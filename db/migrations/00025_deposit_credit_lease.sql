-- Single-flight lease so webhook/confirm/cron cannot double-send deposit crypto
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit_lease_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_credit_lease
  ON transactions (credit_lease_until)
  WHERE credit_lease_until IS NOT NULL;
