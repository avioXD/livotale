-- 006: Home visits, technician workflow, consent events during visits, routes, equipment, and notes.

BEGIN;

CREATE TABLE operations.home_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  address_id uuid NOT NULL REFERENCES clinical.patient_addresses(id) ON DELETE RESTRICT,
  visit_type operations.visit_type_enum NOT NULL,
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  status operations.visit_status_enum NOT NULL DEFAULT 'booked',
  cancellation_reason text,
  rescheduled_from_visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_visits_time_chk CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE TRIGGER trg_home_visits_updated_at
BEFORE UPDATE ON operations.home_visits
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.visit_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  code varchar(80) NOT NULL,
  title varchar(160) NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  status operations.checklist_status_enum NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, code)
);

CREATE TABLE operations.visit_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(5,2),
  bp_systolic int,
  bp_diastolic int,
  waist_cm numeric(5,2),
  pulse int,
  spo2 int,
  notes text,
  recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_vitals_weight_chk CHECK (weight_kg IS NULL OR weight_kg > 0),
  CONSTRAINT visit_vitals_height_chk CHECK (height_cm IS NULL OR height_cm > 0),
  CONSTRAINT visit_vitals_bmi_chk CHECK (bmi IS NULL OR bmi > 0),
  CONSTRAINT visit_vitals_bp_chk CHECK ((bp_systolic IS NULL AND bp_diastolic IS NULL) OR (bp_systolic > 0 AND bp_diastolic > 0)),
  CONSTRAINT visit_vitals_spo2_chk CHECK (spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100))
);

CREATE TABLE operations.digital_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  consent_type audit.consent_type_enum NOT NULL,
  consent_version varchar(40) NOT NULL,
  signed_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  ip_address inet,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE operations.technician_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  route_date date NOT NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  total_distance_km numeric(8,2),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technician_id, route_date)
);

CREATE TABLE operations.technician_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES operations.technician_routes(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  eta_at timestamptz,
  arrived_at timestamptz,
  status operations.route_stop_status_enum NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, visit_id)
);

CREATE TABLE operations.equipment_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code varchar(80) NOT NULL UNIQUE,
  asset_type varchar(80) NOT NULL,
  model varchar(120),
  serial_number varchar(120),
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  status operations.equipment_status_enum NOT NULL DEFAULT 'available',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_equipment_assets_updated_at
BEFORE UPDATE ON operations.equipment_assets
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.technician_equipment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES operations.equipment_assets(id) ON DELETE RESTRICT,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  status_note varchar(180),
  battery_percent int,
  logged_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technician_equipment_battery_chk CHECK (battery_percent IS NULL OR (battery_percent >= 0 AND battery_percent <= 100))
);

CREATE TABLE operations.technician_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  note text NOT NULL,
  flag_issue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
