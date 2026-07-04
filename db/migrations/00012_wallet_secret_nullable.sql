-- Allow encrypted-only wallets; plaintext column optional during migration
ALTER TABLE users ALTER COLUMN wallet_secret DROP NOT NULL;
