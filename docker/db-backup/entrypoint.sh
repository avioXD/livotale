#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

DB_BACKUP_CRON="${DB_BACKUP_CRON:-0 2 * * *}"
RUN_BACKUP_ON_STARTUP="${RUN_BACKUP_ON_STARTUP:-false}"

if [ "$RUN_BACKUP_ON_STARTUP" = "true" ]; then
  /usr/local/bin/backup.sh
fi

cat > /etc/crontabs/root <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
${DB_BACKUP_CRON} /usr/local/bin/backup.sh >> /proc/1/fd/1 2>> /proc/1/fd/2
EOF

echo "Scheduled PostgreSQL S3 backup with cron: ${DB_BACKUP_CRON}"
exec crond -f -l 8
