-- Phone transfers can be reclaimed by the sender after the claim window.

ALTER TABLE pending_phone_transfers
  ADD COLUMN IF NOT EXISTS claimable_balance_id TEXT,
  ADD COLUMN IF NOT EXISTS early_claimant TEXT,
  ADD COLUMN IF NOT EXISTS reclaimed_at TIMESTAMPTZ;
