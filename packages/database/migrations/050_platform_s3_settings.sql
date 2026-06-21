-- 050: Platform S3 storage settings (encrypted credentials in integrations.platform_settings)

BEGIN;

ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS s3_bucket text,
  ADD COLUMN IF NOT EXISTS s3_region text,
  ADD COLUMN IF NOT EXISTS s3_key_prefix text,
  ADD COLUMN IF NOT EXISTS s3_endpoint text,
  ADD COLUMN IF NOT EXISTS s3_public_endpoint text,
  ADD COLUMN IF NOT EXISTS s3_access_key_id text,
  ADD COLUMN IF NOT EXISTS s3_secret_access_key_enc bytea;

COMMIT;
