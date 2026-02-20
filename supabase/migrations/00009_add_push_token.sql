-- Add push notification token for Expo push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
