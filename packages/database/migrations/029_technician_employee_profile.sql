-- 029: Technician employee profile — address, emergency contact, legal documents, service pincodes

BEGIN;

CREATE TYPE operations.technician_document_type_enum AS ENUM (
  'aadhaar',
  'pan',
  'driving_license',
  'police_verification',
  'medical_certificate',
  'employment_contract',
  'nda',
  'training_certificate',
  'other'
);

CREATE TYPE operations.compliance_doc_status_enum AS ENUM (
  'pending',
  'verified',
  'rejected',
  'expired'
);

CREATE TABLE operations.technician_employee_profiles (
  technician_id uuid PRIMARY KEY REFERENCES operations.technicians(id) ON DELETE CASCADE,
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
  vehicle_type varchar(80),
  vehicle_number varchar(40),
  joined_on date,
  bank_account_last4 varchar(4),
  additional_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_technician_employee_profiles_updated_at
BEFORE UPDATE ON operations.technician_employee_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.technician_compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  document_type operations.technician_document_type_enum NOT NULL,
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

CREATE INDEX idx_technician_compliance_docs_tech ON operations.technician_compliance_documents(technician_id);

CREATE TRIGGER trg_technician_compliance_documents_updated_at
BEFORE UPDATE ON operations.technician_compliance_documents
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
