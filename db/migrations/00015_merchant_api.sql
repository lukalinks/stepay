-- Merchant API: API keys, checkout sessions, webhooks

CREATE TABLE IF NOT EXISTS merchant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  webhook_secret TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_user ON merchant_api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_hash ON merchant_api_keys (key_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS merchant_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES merchant_api_keys(id) ON DELETE SET NULL,
  checkout_token TEXT NOT NULL UNIQUE,
  amount DOUBLE PRECISION NOT NULL,
  asset TEXT NOT NULL DEFAULT 'usdc',
  label TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  payer_id UUID REFERENCES users(id),
  tx_hash TEXT,
  success_url TEXT,
  cancel_url TEXT,
  webhook_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_checkouts_merchant ON merchant_checkouts (merchant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_checkouts_token ON merchant_checkouts (checkout_token);
CREATE INDEX IF NOT EXISTS idx_merchant_checkouts_reference ON merchant_checkouts (merchant_user_id, reference_id);

CREATE TABLE IF NOT EXISTS merchant_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id UUID NOT NULL REFERENCES merchant_checkouts(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhook_checkout ON merchant_webhook_deliveries (checkout_id);
