-- Password-encrypted wallet vault backup (client-side ciphertext only; Stepay cannot decrypt without user password).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_backup_enc TEXT,
  ADD COLUMN IF NOT EXISTS wallet_backup_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS wallet_restore_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirm_code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_restore_verifications_user
  ON wallet_restore_verifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_restore_verifications_expires
  ON wallet_restore_verifications (expires_at);
