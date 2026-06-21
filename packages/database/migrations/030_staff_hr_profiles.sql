-- 030: Generic staff HR profiles & compliance documents (all roles except technician-specific tables)

BEGIN;

CREATE TYPE operations.staff_hr_role_enum AS ENUM (
  'doctor',
  'lab_partner',
  'dietician',
  'health_coach',
  'pharmacy',
  'operations'
);

CREATE TYPE operations.staff_document_type_enum AS ENUM (
  'aadhaar',
  'pan',
  'driving_license',
  'police_verification',
  'medical_certificate',
  'employment_contract',
  'nda',
  'training_certificate',
  'medical_registration',
  'degree_certificate',
  'indemnity_insurance',
  'lab_registration',
  'nabl_certificate',
  'gst_certificate',
  'drug_license',
  'shop_establishment',
  'professional_registration',
  'coaching_certification',
  'other'
);

CREATE TABLE operations.staff_hr_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role operations.staff_hr_role_enum NOT NULL,
  member_id uuid NOT NULL,
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  employee_code varchar(40),
  verification_status varchar(40) NOT NULL DEFAULT 'pending',
  employment_status varchar(40) NOT NULL DEFAULT 'active',
  home_line1 varchar(255),
  home_line2 varchar(255),
  home_city varchar(120),
  home_state varchar(80),
  home_pincode varchar(10),
  emergency_contact_name varchar(120),
  emergency_contact_mobile varchar(20),
  emergency_contact_relation varchar(60),
  qualification varchar(255),
  certification varchar(255),
  registration_number varchar(120),
  clinic_or_org_name varchar(255),
  specialization varchar(120),
  vehicle_type varchar(80),
  vehicle_number varchar(40),
  joined_on date,
  bank_account_last4 varchar(4),
  additional_notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, member_id)
);

CREATE TRIGGER trg_staff_hr_profiles_updated_at
BEFORE UPDATE ON operations.staff_hr_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.staff_hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES operations.staff_hr_profiles(id) ON DELETE CASCADE,
  document_type operations.staff_document_type_enum NOT NULL,
  document_number varchar(80),
  file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  storage_url text,
  issued_on date,
  expires_on date,
  status operations.compliance_doc_status_enum NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_hr_documents_profile ON operations.staff_hr_documents(profile_id);

CREATE TRIGGER trg_staff_hr_documents_updated_at
BEFORE UPDATE ON operations.staff_hr_documents
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
