-- Admin OTP login (passwordless) for admin@stepay.pro

CREATE TABLE IF NOT EXISTS admin_login_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  confirm_code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_verifications_user_id ON admin_login_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_verifications_expires ON admin_login_verifications(expires_at);

-- Platform admin account (OTP-only; no password)
INSERT INTO users (
  email,
  phone_number,
  pin_hash,
  password_hash,
  wallet_public,
  wallet_secret,
  role,
  country_code
)
SELECT
  'admin@stepay.pro',
  NULL,
  'admin-otp',
  NULL,
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  NULL,
  'admin',
  'ZM'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE lower(trim(email)) = lower('admin@stepay.pro')
);

-- Ensure existing admin@stepay.pro has admin role and no password requirement
UPDATE users
SET role = 'admin', pin_hash = 'admin-otp', password_hash = NULL
WHERE lower(trim(email)) = lower('admin@stepay.pro');
