-- Optional phone for WhatsApp / SMS invite delivery
ALTER TABLE invites ADD COLUMN IF NOT EXISTS phone TEXT;
