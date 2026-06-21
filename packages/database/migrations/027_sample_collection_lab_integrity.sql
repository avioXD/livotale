-- 027: Sample QR verification and lab test linkage for chain-of-custody

BEGIN;

ALTER TABLE operations.sample_collections
  ADD COLUMN IF NOT EXISTS qr_verification_code varchar(64),
  ADD COLUMN IF NOT EXISTS qr_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sample_collections_qr_code
  ON operations.sample_collections(qr_verification_code)
  WHERE qr_verification_code IS NOT NULL;

COMMENT ON COLUMN operations.sample_collections.qr_verification_code IS
  'Unique verification token printed on sample bottle QR for patient identity checks';
COMMENT ON COLUMN operations.sample_photos.photo_type IS
  'container_label | container_qr | lab_bottle_verification';

COMMIT;
