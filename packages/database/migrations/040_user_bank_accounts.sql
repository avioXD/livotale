-- 040: Centralized encrypted bank / payout profiles per identity user

BEGIN;

CREATE TABLE identity.user_bank_accounts (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  account_holder_name varchar(160),
  account_number_encrypted bytea,
  account_number_last4 varchar(4),
  ifsc_code varchar(11),
  bank_name varchar(120),
  branch_name varchar(120),
  upi_id varchar(120),
  verification_status varchar(20) NOT NULL DEFAULT 'pending',
  verification_doc_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verification_notes text,
  required_for_payout boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_bank_accounts_verification
  ON identity.user_bank_accounts (verification_status);

CREATE INDEX idx_user_bank_accounts_required
  ON identity.user_bank_accounts (required_for_payout)
  WHERE required_for_payout = true;

CREATE TRIGGER trg_user_bank_accounts_updated_at
BEFORE UPDATE ON identity.user_bank_accounts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

INSERT INTO identity.user_bank_accounts (user_id, account_number_last4, verification_status)
SELECT hr.user_id, hr.bank_account_last4, 'pending'
FROM operations.staff_hr_profiles hr
WHERE hr.bank_account_last4 IS NOT NULL
  AND hr.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO identity.user_bank_accounts (user_id, account_number_last4, verification_status)
SELECT t.user_id, ep.bank_account_last4, 'pending'
FROM operations.technicians t
JOIN operations.technician_employee_profiles ep ON ep.technician_id = t.id
WHERE ep.bank_account_last4 IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
