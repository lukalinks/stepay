-- Platform settings for rates and fees (admin-managed)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value_json) VALUES
  ('rates', '{"xlm_buy": 3.5, "xlm_sell": 3.5, "usdc_buy": 25, "usdc_sell": 25}'),
  ('fee', '{"buy_percent": 0, "sell_percent": 0}')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
