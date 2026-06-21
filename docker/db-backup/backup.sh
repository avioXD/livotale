#!/bin/sh
set -eu

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-livotale_user}"
POSTGRES_DB="${POSTGRES_DB:-livotale}"
S3_REGION="${S3_REGION:-ap-south-1}"
S3_BACKUP_PREFIX="${S3_BACKUP_PREFIX:-backub}"

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
date_path="$(date -u +"%Y/%m/%d")"
clean_prefix="$(printf "%s" "$S3_BACKUP_PREFIX" | sed "s#^/*##; s#/*$##")"

if [ -z "$clean_prefix" ]; then
  clean_prefix="backub"
fi

backup_name="${POSTGRES_DB}_${timestamp}.sql.gz"
s3_key="${clean_prefix}/${date_path}/${timestamp}/${backup_name}"
tmp_dir="$(mktemp -d)"
dump_path="${tmp_dir}/${backup_name}"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT INT TERM

echo "Starting PostgreSQL backup for database '${POSTGRES_DB}' at ${timestamp}"

export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump \
  --host "$POSTGRES_HOST" \
  --port "$POSTGRES_PORT" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --format plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$dump_path"

if [ -n "${S3_ENDPOINT:-}" ]; then
  aws --region "$S3_REGION" --endpoint-url "$S3_ENDPOINT" s3 cp "$dump_path" "s3://${S3_BUCKET}/${s3_key}"
else
  aws --region "$S3_REGION" s3 cp "$dump_path" "s3://${S3_BUCKET}/${s3_key}"
fi

echo "Uploaded PostgreSQL backup to s3://${S3_BUCKET}/${s3_key}"
