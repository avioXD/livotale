-- 012: DPDP-oriented notice, purpose, consent, access, audit, user-rights, retention, breach tables.

BEGIN;

CREATE TABLE audit.privacy_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  version varchar(40) NOT NULL,
  title varchar(180) NOT NULL,
  notice_text text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  status core.record_status_enum NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);

CREATE TABLE audit.data_processing_purposes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  description text,
  lawful_basis varchar(120),
  default_retention_days int,
  is_sensitive boolean NOT NULL DEFAULT true,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purposes_retention_chk CHECK (default_retention_days IS NULL OR default_retention_days > 0)
);

CREATE TABLE audit.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  consent_type audit.consent_type_enum NOT NULL,
  consent_version varchar(40) NOT NULL,
  consent_text text NOT NULL,
  signed_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  ip_address inet,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit.user_purpose_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  purpose_id uuid NOT NULL REFERENCES audit.data_processing_purposes(id) ON DELETE RESTRICT,
  privacy_notice_id uuid REFERENCES audit.privacy_notices(id) ON DELETE SET NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purpose_id, privacy_notice_id)
);

CREATE TABLE audit.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES clinical.patients(id) ON DELETE SET NULL,
  access_reason varchar(180),
  accessed_module varchar(120) NOT NULL,
  entity_type varchar(120),
  entity_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(120) NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit.data_rights_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES clinical.patients(id) ON DELETE SET NULL,
  request_type audit.data_right_type_enum NOT NULL,
  request_reason text,
  status audit.request_status_enum NOT NULL DEFAULT 'requested',
  reviewed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE audit.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  request_reason text,
  status audit.request_status_enum NOT NULL DEFAULT 'requested',
  reviewed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE audit.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(120) NOT NULL UNIQUE,
  purpose_id uuid REFERENCES audit.data_processing_purposes(id) ON DELETE SET NULL,
  retention_days int NOT NULL,
  retention_action audit.retention_action_enum NOT NULL DEFAULT 'archive',
  legal_hold_allowed boolean NOT NULL DEFAULT true,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retention_policies_days_chk CHECK (retention_days > 0)
);

CREATE TABLE audit.breach_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code varchar(80) NOT NULL UNIQUE,
  title varchar(180) NOT NULL,
  description text NOT NULL,
  status audit.breach_status_enum NOT NULL DEFAULT 'suspected',
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz,
  reported_at timestamptz,
  affected_users_count int,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT breach_incidents_users_chk CHECK (affected_users_count IS NULL OR affected_users_count >= 0)
);

CREATE TRIGGER trg_breach_incidents_updated_at
BEFORE UPDATE ON audit.breach_incidents
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
