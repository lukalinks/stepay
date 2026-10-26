-- Persist Terms acceptance at signup for compliance trail
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN users.terms_accepted_at IS 'When the user accepted Terms of Service and Privacy Policy at signup';
