-- Phone Pay, money requests, pay links, KYC tiers

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS kyc_tier TEXT NOT NULL DEFAULT 'basic';

CREATE INDEX IF NOT EXISTS idx_users_phone_normalized
  ON users (phone_normalized) WHERE phone_normalized IS NOT NULL;

CREATE TABLE IF NOT EXISTS pending_phone_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_phone_normalized TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  asset TEXT NOT NULL DEFAULT 'usdc',
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  claim_token TEXT NOT NULL UNIQUE,
  escrow_tx_hash TEXT,
  payout_tx_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_by UUID REFERENCES users(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_phone_claim ON pending_phone_transfers (claim_token);
CREATE INDEX IF NOT EXISTS idx_pending_phone_recipient ON pending_phone_transfers (recipient_phone_normalized, status);

CREATE TABLE IF NOT EXISTS money_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payer_phone_normalized TEXT,
  payer_id UUID REFERENCES users(id),
  amount DOUBLE PRECISION NOT NULL,
  asset TEXT NOT NULL DEFAULT 'usdc',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  pay_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  send_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_money_requests_token ON money_requests (pay_token);

CREATE TABLE IF NOT EXISTS pay_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  amount DOUBLE PRECISION,
  asset TEXT NOT NULL DEFAULT 'usdc',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_links_user ON pay_links (user_id);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created ON compliance_alerts (created_at DESC);
