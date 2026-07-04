#!/bin/bash
set -euo pipefail
CRON_SECRET="$(grep '^CRON_SECRET=' /var/www/stepay/.env | cut -d= -f2-)"
cat >/etc/cron.d/stepay-deposits <<EOF
*/5 * * * * root curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/check-deposits >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/stepay-deposits
cat /etc/cron.d/stepay-deposits
