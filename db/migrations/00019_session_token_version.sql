-- Invalidate JWT sessions on password reset by bumping session_token_version.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token_version INTEGER NOT NULL DEFAULT 0;
