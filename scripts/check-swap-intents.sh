#!/bin/bash
sudo -u postgres psql -d stepay -c "SELECT id, status, payload::text, pg_typeof(payload) FROM sign_intents WHERE type='SWAP' ORDER BY created_at DESC LIMIT 3;"
