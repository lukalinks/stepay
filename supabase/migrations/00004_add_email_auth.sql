-- Add email/password auth support for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id TEXT UNIQUE;

-- Make phone_number nullable for email-only users
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;

-- Index for auth lookup
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id) WHERE auth_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
