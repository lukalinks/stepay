-- Optional user profile picture (URL path served by /api/user/avatar/[userId])
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
