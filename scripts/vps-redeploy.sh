#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/stepay"
ARCHIVE="/root/stepay-deploy.tgz"

if [ ! -f "$ARCHIVE" ]; then
  echo "Missing $ARCHIVE"
  exit 1
fi

cp "$APP_DIR/.env" /root/stepay-env.backup
cd "$APP_DIR"
tar -xzf "$ARCHIVE"
cp /root/stepay-env.backup "$APP_DIR/.env"

npm ci
node scripts/setup-db.mjs
npm run build

pm2 restart stepay --update-env
sleep 3

echo -n "health: "
curl -s https://stepay.pro/api/health || curl -s http://127.0.0.1:3000/api/health
echo
pm2 status stepay
echo "REDEPLOY_OK"
