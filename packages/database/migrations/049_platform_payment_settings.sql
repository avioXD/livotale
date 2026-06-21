-- 049: Platform-wide payment collection settings (UPI ID + QR image)

BEGIN;

ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS payment_upi_id varchar(256),
  ADD COLUMN IF NOT EXISTS payment_qr_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_payee_name varchar(160);

COMMIT;
