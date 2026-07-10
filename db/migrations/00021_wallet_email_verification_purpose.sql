-- Extend wallet email OTP verifications for backup manage + export flows.

ALTER TABLE wallet_restore_verifications
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'restore',
  ADD COLUMN IF NOT EXISTS challenge_nonce TEXT;

CREATE INDEX IF NOT EXISTS idx_wallet_restore_verifications_purpose
  ON wallet_restore_verifications (user_id, purpose, created_at DESC);
