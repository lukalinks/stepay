-- User country for local currency and payment rails
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZM';
