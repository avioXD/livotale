-- 026: Sample collection chain-of-custody, technician assignment extensions, lab workflow

BEGIN;

CREATE TYPE operations.technician_type_enum AS ENUM (
  'home_collector',
  'hospital_collector',
  'center_collector',
  'fibroscan_technician',
  'multi_role'
);

CREATE TYPE operations.sample_collection_type_enum AS ENUM (
  'home',
  'hospital',
  'center'
);

CREATE TYPE operations.sample_collection_status_enum AS ENUM (
  'sample_id_generated',
  'pending_technician_assignment',
  'assigned',
  'accepted',
  'travel_started',
  'reached_location',
  'collection_started',
  'sample_collected',
  'sample_image_uploaded',
  'pending_lab_handover',
  'handed_over_to_lab',
  'received_by_lab',
  'rejected_by_lab',
  'testing_started',
  'testing_in_progress',
  'report_uploaded',
  'pending_approval',
  'approved',
  'published_to_patient',
  'recollection_required',
  'failed',
  'cancelled',
  'completed'
);

CREATE TYPE operations.sample_rejection_reason_enum AS ENUM (
  'sample_id_mismatch',
  'image_unclear',
  'damaged',
  'leaked',
  'wrong_container',
  'insufficient_quantity',
  'delayed_delivery',
  'not_labelled',
  'patient_mismatch',
  'test_not_possible',
  'other'
);

ALTER TABLE operations.technicians
  ADD COLUMN IF NOT EXISTS technician_type operations.technician_type_enum NOT NULL DEFAULT 'home_collector',
  ADD COLUMN IF NOT EXISTS max_appointments_per_day int NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS service_zone varchar(120),
  ADD COLUMN IF NOT EXISTS profile_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE operations.technician_service_pincodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  pincode varchar(10) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technician_id, pincode)
);

CREATE INDEX idx_technician_pincodes_pincode ON operations.technician_service_pincodes(pincode)
  WHERE is_active = true;

CREATE TABLE operations.sample_collection_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  collection_duration_minutes int NOT NULL DEFAULT 45,
  travel_buffer_minutes int NOT NULL DEFAULT 15,
  max_daily_appointments_per_technician int NOT NULL DEFAULT 12,
  service_radius_km numeric(6,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sample_collection_config_updated_at
BEFORE UPDATE ON operations.sample_collection_config
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

INSERT INTO operations.sample_collection_config(collection_duration_minutes, travel_buffer_minutes)
VALUES (45, 15);

CREATE TABLE operations.sample_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES operations.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  sample_code varchar(32) NOT NULL UNIQUE,
  collection_type operations.sample_collection_type_enum NOT NULL DEFAULT 'home',
  status operations.sample_collection_status_enum NOT NULL DEFAULT 'sample_id_generated',
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  lab_partner_id uuid REFERENCES operations.lab_partners(id) ON DELETE SET NULL,
  lab_order_id uuid REFERENCES clinical.lab_orders(id) ON DELETE SET NULL,
  pincode varchar(10),
  priority varchar(20) NOT NULL DEFAULT 'normal',
  sample_type varchar(40),
  tubes_count int,
  container_type varchar(80),
  fasting_status varchar(40),
  collection_remarks text,
  assigned_at timestamptz,
  collected_at timestamptz,
  handed_over_at timestamptz,
  received_at timestamptz,
  report_published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sample_collections_updated_at
BEFORE UPDATE ON operations.sample_collections
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX idx_sample_collections_patient ON operations.sample_collections(patient_id, created_at DESC);
CREATE INDEX idx_sample_collections_technician_status ON operations.sample_collections(technician_id, status);
CREATE INDEX idx_sample_collections_lab_status ON operations.sample_collections(lab_partner_id, status);
CREATE INDEX idx_sample_collections_code ON operations.sample_collections(sample_code);

CREATE TABLE operations.sample_collection_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_collection_id uuid NOT NULL REFERENCES operations.sample_collections(id) ON DELETE CASCADE,
  from_status operations.sample_collection_status_enum,
  to_status operations.sample_collection_status_enum NOT NULL,
  changed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  actor_role varchar(40),
  reason varchar(120),
  notes text,
  geo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sample_status_history_collection ON operations.sample_collection_status_history(sample_collection_id, created_at DESC);

CREATE TABLE operations.sample_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_collection_id uuid NOT NULL REFERENCES operations.sample_collections(id) ON DELETE CASCADE,
  file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  photo_type varchar(40) NOT NULL DEFAULT 'container_label',
  visible_to_patient boolean NOT NULL DEFAULT false,
  visible_to_doctor boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  geo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE operations.sample_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_collection_id uuid NOT NULL REFERENCES operations.sample_collections(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  lab_partner_id uuid REFERENCES operations.lab_partners(id) ON DELETE SET NULL,
  handover_at timestamptz NOT NULL DEFAULT now(),
  handover_location varchar(200),
  container_count int,
  sample_condition varchar(80),
  remarks text,
  lab_receiver_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.lab_report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id uuid NOT NULL REFERENCES clinical.lab_reports(id) ON DELETE CASCADE,
  approval_stage varchar(40) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION operations.next_sample_collection_code(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq int;
BEGIN
  SELECT COUNT(*)::int + 1 INTO seq
  FROM operations.sample_collections
  WHERE created_at::date = p_date;
  RETURN 'LGSC-' || to_char(p_date, 'YYYYMMDD') || '-' || lpad(seq::text, 6, '0');
END;
$$;

INSERT INTO identity.permissions (code, description) VALUES
  ('sample.view_assigned', 'View assigned sample collections'),
  ('sample.update_collection', 'Update sample collection field workflow'),
  ('sample.view_lab_queue', 'View lab sample receive queue'),
  ('sample.manage_reports', 'Upload and manage lab sample reports'),
  ('sample.admin_all', 'Full sample collection administration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM identity.roles r
CROSS JOIN identity.permissions p
WHERE (r.code = 'technician' AND p.code IN ('sample.view_assigned', 'sample.update_collection'))
   OR (r.code = 'lab_partner' AND p.code IN ('sample.view_lab_queue', 'sample.manage_reports'))
   OR (r.code IN ('admin', 'support', 'city_manager') AND p.code = 'sample.admin_all')
ON CONFLICT DO NOTHING;

COMMIT;
