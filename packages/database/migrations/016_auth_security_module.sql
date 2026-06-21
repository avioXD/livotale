-- 016: Auth security module — roles, sessions audit, profile extensions, OTP/2FA.

BEGIN;

-- New roles for City Manager (Operations uses existing `support` code).
INSERT INTO identity.roles(code, name, description) VALUES
  ('city_manager', 'City Manager', 'City-level operations and analytics manager')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Security columns on users.
ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS twofa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twofa_secret text,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_locked_until ON identity.users(locked_until)
  WHERE locked_until IS NOT NULL;

-- Login audit trail.
CREATE TABLE IF NOT EXISTS identity.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  identifier_used varchar(160),
  login_method varchar(40) NOT NULL DEFAULT 'password',
  success boolean NOT NULL,
  failure_reason varchar(120),
  ip_address inet,
  user_agent text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_date ON identity.login_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON identity.login_logs(ip_address, created_at DESC);

-- Registered devices (linked to sessions).
CREATE TABLE IF NOT EXISTS identity.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  device_label varchar(120) NOT NULL DEFAULT 'Unknown device',
  device_fingerprint varchar(255),
  user_agent text,
  last_ip inet,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_trusted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON identity.user_devices(user_id, last_seen_at DESC);

ALTER TABLE identity.web_sessions
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES identity.user_devices(id) ON DELETE SET NULL;

-- Mobile OTP challenges.
CREATE TABLE IF NOT EXISTS identity.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile varchar(20) NOT NULL,
  otp_hash text NOT NULL,
  purpose varchar(40) NOT NULL DEFAULT 'login',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_mobile ON identity.otp_challenges(mobile, created_at DESC);

-- Social OAuth identities (stub for future providers).
CREATE TABLE IF NOT EXISTS identity.oauth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  provider_user_id varchar(255) NOT NULL,
  email citext,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

-- Patient family members.
CREATE TABLE IF NOT EXISTS clinical.patient_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  full_name varchar(160) NOT NULL,
  relationship varchar(60) NOT NULL,
  mobile varchar(20),
  email citext,
  dob date,
  is_emergency_contact boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_family_members_updated_at
BEFORE UPDATE ON clinical.patient_family_members
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_patient_family_members_patient ON clinical.patient_family_members(patient_id);

-- Patient insurance.
CREATE TABLE IF NOT EXISTS clinical.patient_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  provider_name varchar(160) NOT NULL,
  policy_number varchar(80) NOT NULL,
  group_number varchar(80),
  valid_from date,
  valid_until date,
  is_primary boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, policy_number)
);

CREATE TRIGGER trg_patient_insurance_updated_at
BEFORE UPDATE ON clinical.patient_insurance
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Identity verification (KYC) records.
CREATE TABLE IF NOT EXISTS identity.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  document_type varchar(60) NOT NULL,
  document_number varchar(80),
  status varchar(40) NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_identity_verifications_updated_at
BEFORE UPDATE ON identity.identity_verifications
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_identity_verifications_user ON identity.identity_verifications(user_id);

-- Activity log (user actions).
CREATE TABLE IF NOT EXISTS audit.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80),
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON audit.activity_logs(user_id, created_at DESC);

-- City manager permissions.
INSERT INTO identity.permissions(code, description) VALUES
  ('city.view_analytics', 'View city-level patient and operations analytics'),
  ('city.manage_staff', 'Manage staff assignments within assigned city')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON
  (r.code = 'city_manager' AND p.code IN ('city.view_analytics', 'city.manage_staff', 'admin.view_operations'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
