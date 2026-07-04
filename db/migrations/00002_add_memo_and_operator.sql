-- Store deposit memo for SELL transactions (to match confirm)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deposit_memo TEXT;

-- Store user's preferred mobile operator for payouts
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_operator TEXT DEFAULT 'mtn';

-- Index for memo lookup
CREATE INDEX IF NOT EXISTS idx_transactions_deposit_memo ON transactions(deposit_memo) WHERE deposit_memo IS NOT NULL;
