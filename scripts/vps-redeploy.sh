#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/stepay"
ARCHIVE="/root/stepay-deploy.tgz"
BUILD_DIR="/var/www/stepay-build-$$"
NEXT_LIVE="$APP_DIR/.next"
NEXT_PREV="$APP_DIR/.next-prev"
DATA_DIR="/var/www/stepay-data"

mkdir -p "$DATA_DIR/avatars"

if [ ! -f "$ARCHIVE" ]; then
  echo "Missing $ARCHIVE"
  exit 1
fi

cp "$APP_DIR/.env" /root/stepay-env.backup

# Stage source + build away from the live .next so users aren't served half-built chunks.
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
tar -xzf "$ARCHIVE" -C "$BUILD_DIR"
cp /root/stepay-env.backup "$BUILD_DIR/.env"

# Keep node_modules warm when possible (copy then ci is faster than cold install).
if [ -d "$APP_DIR/node_modules" ]; then
  cp -a "$APP_DIR/node_modules" "$BUILD_DIR/node_modules"
fi

cd "$BUILD_DIR"
npm ci
node scripts/setup-db.mjs
npm run build

# Sync app files into live dir, but swap .next atomically after build succeeds.
rsync -a --delete \
  --exclude '.next' \
  --exclude '.next-prev' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.pgdata' \
  "$BUILD_DIR/" "$APP_DIR/"

# Refresh node_modules in place
rsync -a --delete "$BUILD_DIR/node_modules/" "$APP_DIR/node_modules/"
cp /root/stepay-env.backup "$APP_DIR/.env"

# Atomic .next swap — old build stays served until this completes.
rm -rf "$NEXT_PREV"
if [ -d "$NEXT_LIVE" ]; then
  mv "$NEXT_LIVE" "$NEXT_PREV"
fi
mv "$BUILD_DIR/.next" "$NEXT_LIVE"
rm -rf "$BUILD_DIR" "$NEXT_PREV"

cd "$APP_DIR"
pm2 restart stepay --update-env
sleep 3

echo -n "health: "
curl -s https://stepay.pro/api/health || curl -s http://127.0.0.1:3000/api/health
echo
pm2 status stepay
echo "REDEPLOY_OK"
