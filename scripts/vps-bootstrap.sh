#!/bin/bash
set -euo pipefail

DB_PASS="${DB_PASS:?DB_PASS required}"
APP_DIR="/var/www/stepay"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx postgresql postgresql-contrib git certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='stepay'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER stepay WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='stepay'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE stepay OWNER stepay;"

mkdir -p "$APP_DIR"
rm -rf "${APP_DIR:?}/"*
tar -xzf /root/stepay-deploy.tgz -C "$APP_DIR"
cp /root/stepay-deploy.env "$APP_DIR/.env"

cd "$APP_DIR"
npm ci
node scripts/setup-db.mjs
npm run build

pm2 delete stepay 2>/dev/null || true
pm2 start npm --name stepay -- start
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

cat >/etc/nginx/sites-available/stepay.pro <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name stepay.pro www.stepay.pro;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/stepay.pro /etc/nginx/sites-enabled/stepay.pro
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

CRON_SECRET="$(grep '^CRON_SECRET=' .env | cut -d= -f2-)"
cat >/etc/cron.d/stepay-deposits <<CRON
*/5 * * * * root curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/check-deposits >/dev/null 2>&1
CRON
chmod 644 /etc/cron.d/stepay-deposits

certbot --apache -d stepay.pro -d www.stepay.pro --non-interactive --agree-tos -m lukayooma@gmail.com --redirect || true

if [ -f /etc/letsencrypt/live/stepay.pro/fullchain.pem ]; then
  sed -i 's|^AUTH_URL=http://|AUTH_URL=https://|' "$APP_DIR/.env"
else
  sed -i 's|^AUTH_URL=https://|AUTH_URL=http://|' "$APP_DIR/.env"
fi
pm2 restart stepay || true

echo "DEPLOY_OK"
