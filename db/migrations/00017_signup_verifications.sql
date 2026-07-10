-- Pending signup email verification (OTP before account creation)
CREATE TABLE IF NOT EXISTS signup_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ZM',
  confirm_code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_verifications_email
  ON signup_verifications (lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_signup_verifications_expires
  ON signup_verifications (expires_at);
