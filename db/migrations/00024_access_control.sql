-- Closed beta / public launch access control

INSERT INTO platform_settings (key, value_json)
VALUES ('access', '{"publicLaunch": true}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_email_lower_uidx
  ON invites (lower(trim(email)));

CREATE INDEX IF NOT EXISTS invites_status_idx ON invites (status);
CREATE INDEX IF NOT EXISTS invites_token_idx ON invites (token);

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_lower_uidx
  ON waitlist (lower(trim(email)));

ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_id UUID REFERENCES invites(id) ON DELETE SET NULL;
