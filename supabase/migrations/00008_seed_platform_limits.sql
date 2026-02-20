-- Seed limits in platform_settings (used by lib/rates)
INSERT INTO platform_settings (key, value_json) VALUES
  ('limits', '{"min_deposit_zmw": 4, "max_deposit_zmw": 50000, "min_withdraw_zmw": 4, "max_withdraw_zmw": 50000}')
ON CONFLICT (key) DO NOTHING;
