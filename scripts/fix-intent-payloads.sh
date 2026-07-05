#!/bin/bash
set -euo pipefail

echo "Before:"
sudo -u postgres psql -d stepay -c "SELECT id, type, status, jsonb_typeof(payload) AS kind, left(payload::text, 80) FROM sign_intents WHERE status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 5;"

sudo -u postgres psql -d stepay -c "
UPDATE sign_intents
SET payload = (payload #>> '{}')::jsonb
WHERE jsonb_typeof(payload) = 'string'
  AND status IN ('pending', 'confirmed');
"

echo "After:"
sudo -u postgres psql -d stepay -c "SELECT id, type, status, jsonb_typeof(payload) AS kind, payload::text FROM sign_intents WHERE status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 5;"
