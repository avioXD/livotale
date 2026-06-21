FROM alpine:3.20

RUN apk add --no-cache \
    aws-cli \
    ca-certificates \
    gzip \
    postgresql16-client \
    tzdata

COPY docker/db-backup/backup.sh /usr/local/bin/backup.sh
COPY docker/db-backup/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
