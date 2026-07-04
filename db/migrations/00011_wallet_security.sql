-- Encrypted wallet secrets + sign intents + audit log

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS wallet_key_version SMALLINT DEFAULT 1;

CREATE TABLE IF NOT EXISTS sign_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  confirm_code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts SMALLINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sign_intents_user_status ON sign_intents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sign_intents_expires ON sign_intents(expires_at);

CREATE TABLE IF NOT EXISTS sign_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES sign_intents(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  tx_hash TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sign_audit_user_created ON sign_audit_log(user_id, created_at DESC);
