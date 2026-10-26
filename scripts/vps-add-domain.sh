#!/bin/bash
set -euo pipefail

DOMAIN="getstepay.com"
CONF="/etc/apache2/sites-available/${DOMAIN}.conf"

a2enmod proxy proxy_http headers rewrite ssl 2>/dev/null || true

cat >"$CONF" <<'APACHE'
<VirtualHost *:80>
    ServerName getstepay.com
    ServerAlias www.getstepay.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto http
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    ErrorLog ${APACHE_LOG_DIR}/getstepay-error.log
    CustomLog ${APACHE_LOG_DIR}/getstepay-access.log combined
</VirtualHost>
APACHE

a2ensite "${DOMAIN}.conf"
apache2ctl configtest
systemctl reload apache2

if command -v certbot >/dev/null 2>&1; then
  certbot --apache -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m lukayooma@gmail.com --redirect || true
  systemctl reload apache2 || true
fi

grep -q '^ALT_HOSTS=' /var/www/stepay/.env || echo 'ALT_HOSTS=getstepay.com' >> /var/www/stepay/.env
pm2 restart stepay --update-env

echo "APACHE_${DOMAIN}_OK"
