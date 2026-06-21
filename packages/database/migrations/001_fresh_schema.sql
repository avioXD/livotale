-- Fresh baseline schema generated from the previous migration chain.
-- Intentional local seed data lives in apps/api/scripts/seed_project_bootstrap.py.

-- -----------------------------------------------------------------------------
-- 001_extensions_schemas_enums.sql
-- -----------------------------------------------------------------------------
-- LIVGASTRO scale database
-- 001: Extensions, schemas, shared enums, and utility functions.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS care;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS audit;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE identity.gender_enum AS ENUM ('male', 'female', 'other', 'undisclosed');
CREATE TYPE identity.user_status_enum AS ENUM ('active', 'inactive', 'blocked', 'deleted');
CREATE TYPE identity.session_status_enum AS ENUM ('active', 'revoked', 'expired');

CREATE TYPE core.record_status_enum AS ENUM ('draft', 'active', 'inactive', 'retired', 'deleted');
CREATE TYPE core.recommendation_source_enum AS ENUM ('ai', 'doctor', 'admin', 'system');
CREATE TYPE core.package_status_enum AS ENUM ('recommended', 'active', 'completed', 'cancelled', 'extended', 'expired');
CREATE TYPE core.package_extension_status_enum AS ENUM ('offered', 'accepted', 'declined', 'expired');
CREATE TYPE core.payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE core.notification_channel_enum AS ENUM ('in_app', 'sms', 'whatsapp', 'email', 'push');
CREATE TYPE core.notification_status_enum AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');

CREATE TYPE clinical.alcohol_status_enum AS ENUM ('never', 'occasional', 'regular', 'stopped', 'unknown');
CREATE TYPE clinical.smoking_status_enum AS ENUM ('never', 'current', 'past', 'unknown');
CREATE TYPE clinical.risk_category_enum AS ENUM ('low', 'moderate', 'high', 'critical');
CREATE TYPE clinical.address_type_enum AS ENUM ('home', 'work', 'other');
CREATE TYPE clinical.question_type_enum AS ENUM ('single_choice', 'multi_choice', 'number', 'text', 'boolean', 'date');
CREATE TYPE clinical.fibrosis_stage_enum AS ENUM ('F0', 'F1', 'F2', 'F3', 'F4', 'unknown');
CREATE TYPE clinical.steatosis_grade_enum AS ENUM ('S0', 'S1', 'S2', 'S3', 'unknown');
CREATE TYPE clinical.lab_category_enum AS ENUM ('lft', 'lipid', 'diabetes', 'cbc', 'renal', 'viral', 'coagulation', 'other');
CREATE TYPE clinical.lab_flag_enum AS ENUM ('low', 'normal', 'high', 'critical', 'unknown');
CREATE TYPE clinical.health_score_source_enum AS ENUM ('ai', 'doctor', 'system');
CREATE TYPE clinical.score_color_enum AS ENUM ('green', 'yellow', 'orange', 'red');
CREATE TYPE clinical.alcohol_intake_enum AS ENUM ('none', 'low', 'moderate', 'high', 'unknown');
CREATE TYPE clinical.prescription_type_enum AS ENUM ('ai_draft', 'doctor_final');
CREATE TYPE clinical.prescription_status_enum AS ENUM ('draft', 'pending_doctor_review', 'approved', 'rejected', 'cancelled', 'superseded');
CREATE TYPE clinical.prescription_item_type_enum AS ENUM ('medicine', 'supplement', 'probiotic');
CREATE TYPE clinical.doctor_review_action_enum AS ENUM ('created', 'edited', 'approved', 'rejected', 'cancelled', 'signed', 'released');

CREATE TYPE operations.verification_status_enum AS ENUM ('pending', 'verified', 'blocked');
CREATE TYPE operations.staff_availability_enum AS ENUM ('available', 'busy', 'inactive');
CREATE TYPE operations.visit_type_enum AS ENUM ('initial', 'followup', 'repeat_fibroscan', 'blood_collection', 'package_completion');
CREATE TYPE operations.visit_status_enum AS ENUM ('booked', 'assigned', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show');
CREATE TYPE operations.checklist_status_enum AS ENUM ('pending', 'in_progress', 'done', 'skipped', 'failed');
CREATE TYPE operations.route_stop_status_enum AS ENUM ('pending', 'active', 'done', 'cancelled');
CREATE TYPE operations.equipment_status_enum AS ENUM ('available', 'assigned', 'maintenance', 'retired');
CREATE TYPE operations.sample_status_enum AS ENUM ('pending', 'collected', 'in_transit', 'received', 'processing', 'completed', 'rejected');

CREATE TYPE ai.trigger_type_enum AS ENUM ('registration', 'report_uploaded', 'weekly_checkin', 'doctor_request', 'package_completion', 'manual');
CREATE TYPE ai.assessment_status_enum AS ENUM ('generated', 'sent_to_doctor', 'approved', 'rejected', 'superseded');
CREATE TYPE ai.recommendation_type_enum AS ENUM ('diet', 'exercise', 'medicine', 'supplement', 'test', 'monitoring', 'escalation');
CREATE TYPE ai.severity_enum AS ENUM ('info', 'warning', 'critical');
CREATE TYPE ai.flag_type_enum AS ENUM ('cirrhosis_suspicion', 'rapid_worsening', 'critical_lab', 'alcohol_risk', 'non_compliance', 'drug_contraindication');
CREATE TYPE ai.flag_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ai.flag_status_enum AS ENUM ('open', 'acknowledged', 'resolved');

CREATE TYPE care.member_type_enum AS ENUM ('dietician', 'health_coach');
CREATE TYPE care.task_type_enum AS ENUM ('day15_dietician_call', 'day30_coach_call', 'monthly_followup', 'doctor_escalation', 'package_completion_review');
CREATE TYPE care.task_status_enum AS ENUM ('pending', 'completed', 'missed', 'cancelled', 'rescheduled');
CREATE TYPE care.note_type_enum AS ENUM ('dietician', 'coach', 'doctor', 'admin', 'technician', 'system');
CREATE TYPE care.consultation_type_enum AS ENUM ('video', 'audio', 'chat', 'emergency');
CREATE TYPE care.consultation_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled');
CREATE TYPE care.thread_type_enum AS ENUM ('coach', 'doctor', 'support', 'emergency');
CREATE TYPE care.thread_status_enum AS ENUM ('open', 'closed', 'escalated');
CREATE TYPE care.emergency_status_enum AS ENUM ('open', 'assigned', 'resolved', 'cancelled');

CREATE TYPE commerce.product_type_enum AS ENUM ('medicine', 'supplement', 'probiotic', 'exercise_tool', 'wellness');
CREATE TYPE commerce.order_status_enum AS ENUM ('draft', 'placed', 'confirmed', 'cancelled', 'completed');
CREATE TYPE commerce.payment_provider_enum AS ENUM ('razorpay', 'cashfree', 'stripe', 'manual');
CREATE TYPE commerce.payment_status_enum AS ENUM ('created', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE commerce.delivery_status_enum AS ENUM ('pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');
CREATE TYPE commerce.invoice_status_enum AS ENUM ('draft', 'issued', 'cancelled');
CREATE TYPE commerce.refill_status_enum AS ENUM ('active', 'paused', 'cancelled', 'completed');
CREATE TYPE commerce.inventory_movement_type_enum AS ENUM ('stock_in', 'stock_out', 'adjustment', 'reserved', 'released');

CREATE TYPE storage.file_type_enum AS ENUM ('old_report', 'lab_report', 'fibroscan_report', 'prescription', 'consent', 'invoice', 'profile', 'chat_attachment', 'signature', 'other');

CREATE TYPE audit.consent_type_enum AS ENUM ('home_visit', 'data_processing', 'teleconsultation', 'prescription', 'pharmacy', 'ai_assistance', 'marketing', 'data_sharing');
CREATE TYPE audit.data_right_type_enum AS ENUM ('access', 'correction', 'erasure', 'grievance', 'nomination', 'consent_withdrawal');
CREATE TYPE audit.request_status_enum AS ENUM ('requested', 'under_review', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE audit.breach_status_enum AS ENUM ('suspected', 'confirmed', 'contained', 'reported', 'closed');
CREATE TYPE audit.retention_action_enum AS ENUM ('retain', 'anonymize', 'delete', 'archive');

COMMIT;

-- -----------------------------------------------------------------------------
-- 002_identity_rbac.sql
-- -----------------------------------------------------------------------------
-- 002: Identity, RBAC, web sessions, and early file metadata.

BEGIN;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  mobile varchar(20) UNIQUE,
  email citext UNIQUE,
  password_hash text,
  gender identity.gender_enum NOT NULL DEFAULT 'undisclosed',
  dob date,
  status identity.user_status_enum NOT NULL DEFAULT 'active',
  profile_photo_url text,
  last_login_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_login_contact_chk CHECK (mobile IS NOT NULL OR email IS NOT NULL)
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON identity.users
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE identity.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(120) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE identity.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE RESTRICT,
  clinic_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id, clinic_id),
  CONSTRAINT user_roles_active_window_chk CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX uq_user_roles_primary
ON identity.user_roles(user_id)
WHERE is_primary = true AND ends_at IS NULL;

CREATE TABLE identity.web_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  status identity.session_status_enum NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE storage.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  file_type storage.file_type_enum NOT NULL,
  file_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  storage_url text NOT NULL,
  file_size_bytes bigint,
  checksum varchar(128),
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_size_chk CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE UNIQUE INDEX uq_files_checksum
ON storage.files(checksum)
WHERE checksum IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 003_clinics_cities_staff_profiles.sql
-- -----------------------------------------------------------------------------
-- 003: Geography, clinics, and staff profile tables.

BEGIN;

CREATE TABLE core.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  state varchar(120) NOT NULL,
  country varchar(80) NOT NULL DEFAULT 'India',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state, country)
);

CREATE TABLE core.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  registration_number varchar(120),
  gst_number varchar(30),
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  address text,
  contact_number varchar(20),
  email citext,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_clinics_registration_number
ON core.clinics(registration_number)
WHERE registration_number IS NOT NULL;

CREATE TRIGGER trg_clinics_updated_at
BEFORE UPDATE ON core.clinics
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE identity.user_roles
  ADD CONSTRAINT fk_user_roles_clinic
  FOREIGN KEY (clinic_id) REFERENCES core.clinics(id) ON DELETE SET NULL;

CREATE TABLE core.clinic_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES core.clinics(id) ON DELETE CASCADE,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  label varchar(120) NOT NULL,
  line1 text NOT NULL,
  line2 text,
  pincode varchar(12),
  latitude numeric(10,7),
  longitude numeric(10,7),
  contact_number varchar(20),
  is_primary boolean NOT NULL DEFAULT false,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_clinic_locations_primary
ON core.clinic_locations(clinic_id)
WHERE is_primary = true;

CREATE TABLE identity.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  employee_code varchar(60) UNIQUE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  designation varchar(120),
  joined_on date,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_staff_profiles_updated_at
BEFORE UPDATE ON identity.staff_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  registration_number varchar(120) NOT NULL UNIQUE,
  qualification varchar(180),
  specialization varchar(160),
  years_experience int,
  digital_signature_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctors_experience_chk CHECK (years_experience IS NULL OR years_experience >= 0)
);

CREATE TRIGGER trg_doctors_updated_at
BEFORE UPDATE ON clinical.doctors
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  employee_code varchar(60) NOT NULL UNIQUE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  verification_status operations.verification_status_enum NOT NULL DEFAULT 'pending',
  status operations.staff_availability_enum NOT NULL DEFAULT 'available',
  rating numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technicians_rating_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON operations.technicians
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE care.care_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  member_type care.member_type_enum NOT NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  rating numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_team_rating_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE TRIGGER trg_care_team_members_updated_at
BEFORE UPDATE ON care.care_team_members
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.lab_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  contact_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  registration_number varchar(120),
  contact_number varchar(20),
  email citext,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lab_partners_updated_at
BEFORE UPDATE ON operations.lab_partners
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.pharmacy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  license_number varchar(120),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pharmacy_profiles_updated_at
BEFORE UPDATE ON commerce.pharmacy_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;

-- -----------------------------------------------------------------------------
-- 004_patients_onboarding_questionnaires.sql
-- -----------------------------------------------------------------------------
-- 004: Patient profiles, addresses, comorbidities, onboarding questionnaires, and old reports.

BEGIN;

CREATE TABLE clinical.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
  patient_code varchar(60) NOT NULL UNIQUE,
  primary_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  bmi numeric(5,2),
  blood_group varchar(10),
  alcohol_status clinical.alcohol_status_enum NOT NULL DEFAULT 'unknown',
  smoking_status clinical.smoking_status_enum NOT NULL DEFAULT 'unknown',
  diabetes boolean NOT NULL DEFAULT false,
  hypertension boolean NOT NULL DEFAULT false,
  dyslipidemia boolean NOT NULL DEFAULT false,
  viral_hepatitis boolean NOT NULL DEFAULT false,
  known_cirrhosis boolean NOT NULL DEFAULT false,
  emergency_contact_name varchar(160),
  emergency_contact_mobile varchar(20),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_height_chk CHECK (height_cm IS NULL OR height_cm > 0),
  CONSTRAINT patients_weight_chk CHECK (current_weight_kg IS NULL OR current_weight_kg > 0),
  CONSTRAINT patients_bmi_chk CHECK (bmi IS NULL OR bmi > 0)
);

CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON clinical.patients
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.patient_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  address_type clinical.address_type_enum NOT NULL DEFAULT 'home',
  line1 text NOT NULL,
  line2 text,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  pincode varchar(12),
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_patient_addresses_default
ON clinical.patient_addresses(patient_id)
WHERE is_default = true;

CREATE TRIGGER trg_patient_addresses_updated_at
BEFORE UPDATE ON clinical.patient_addresses
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.patient_comorbidities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  diagnosed_on date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, code)
);

CREATE TABLE clinical.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  title varchar(180) NOT NULL,
  version varchar(40) NOT NULL,
  status core.record_status_enum NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_questionnaires_active_code
ON clinical.questionnaires(code)
WHERE status = 'active';

CREATE TRIGGER trg_questionnaires_updated_at
BEFORE UPDATE ON clinical.questionnaires
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES clinical.questionnaires(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type clinical.question_type_enum NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_weight numeric(8,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.patient_questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL REFERENCES clinical.questionnaires(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  total_score numeric(8,2),
  risk_category clinical.risk_category_enum,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE TABLE clinical.patient_questionnaire_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES clinical.patient_questionnaire_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES clinical.questionnaire_questions(id) ON DELETE RESTRICT,
  answer jsonb NOT NULL,
  score numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
);

CREATE TABLE clinical.patient_old_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  report_type varchar(80),
  report_date date,
  notes text,
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 005_packages_subscriptions_payments_base.sql
-- -----------------------------------------------------------------------------
-- 005: Care packages, package recommendation rules, enrollments, outcomes, and extensions.

BEGIN;

CREATE TABLE core.care_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  duration_days int NOT NULL,
  description text,
  target_condition text,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_price numeric(12,2),
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_packages_duration_chk CHECK (duration_days > 0),
  CONSTRAINT care_packages_price_chk CHECK (base_price >= 0 AND (discount_price IS NULL OR discount_price >= 0))
);

CREATE TRIGGER trg_care_packages_updated_at
BEFORE UPDATE ON core.care_packages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE core.package_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES core.care_packages(id) ON DELETE CASCADE,
  rule_name varchar(160) NOT NULL,
  min_fibroscan_kpa numeric(5,2),
  max_fibroscan_kpa numeric(5,2),
  min_bmi numeric(5,2),
  max_bmi numeric(5,2),
  has_diabetes boolean,
  min_age int,
  max_age int,
  fibrosis_stage clinical.fibrosis_stage_enum,
  steatosis_grade clinical.steatosis_grade_enum,
  fatty_liver_grade varchar(40),
  priority int NOT NULL DEFAULT 100,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, rule_name),
  CONSTRAINT package_rules_fibroscan_range_chk CHECK (min_fibroscan_kpa IS NULL OR max_fibroscan_kpa IS NULL OR min_fibroscan_kpa <= max_fibroscan_kpa),
  CONSTRAINT package_rules_bmi_range_chk CHECK (min_bmi IS NULL OR max_bmi IS NULL OR min_bmi <= max_bmi),
  CONSTRAINT package_rules_age_range_chk CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age)
);

CREATE TABLE core.patient_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES core.care_packages(id) ON DELETE RESTRICT,
  recommended_by core.recommendation_source_enum NOT NULL DEFAULT 'ai',
  ai_assessment_id uuid,
  doctor_approved_by uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status core.package_status_enum NOT NULL DEFAULT 'recommended',
  price_charged numeric(12,2) NOT NULL DEFAULT 0,
  payment_status core.payment_status_enum NOT NULL DEFAULT 'pending',
  dropout_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_packages_dates_chk CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT patient_packages_price_chk CHECK (price_charged >= 0)
);

CREATE TRIGGER trg_patient_packages_updated_at
BEFORE UPDATE ON core.patient_packages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE core.package_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL UNIQUE REFERENCES core.patient_packages(id) ON DELETE CASCADE,
  baseline_fibroscan_kpa numeric(5,2),
  final_fibroscan_kpa numeric(5,2),
  baseline_sgpt numeric(8,2),
  final_sgpt numeric(8,2),
  baseline_sgot numeric(8,2),
  final_sgot numeric(8,2),
  baseline_weight_kg numeric(5,2),
  final_weight_kg numeric(5,2),
  baseline_liver_score numeric(5,2),
  final_liver_score numeric(5,2),
  improvement_percent numeric(6,2),
  extension_offered boolean NOT NULL DEFAULT false,
  extension_discount_percent numeric(5,2),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_outcomes_discount_chk CHECK (extension_discount_percent IS NULL OR (extension_discount_percent >= 0 AND extension_discount_percent <= 100))
);

CREATE TABLE core.package_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL REFERENCES core.patient_packages(id) ON DELETE CASCADE,
  offered_package_id uuid REFERENCES core.care_packages(id) ON DELETE SET NULL,
  offered_discount_percent numeric(5,2),
  status core.package_extension_status_enum NOT NULL DEFAULT 'offered',
  offer_expires_at timestamptz,
  accepted_at timestamptz,
  notification_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_extensions_discount_chk CHECK (offered_discount_percent IS NULL OR (offered_discount_percent >= 0 AND offered_discount_percent <= 100))
);

CREATE TABLE core.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES identity.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES clinical.patients(id) ON DELETE CASCADE,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  title varchar(180) NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.notification_status_enum NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE core.package_extensions
  ADD CONSTRAINT fk_package_extensions_notification
  FOREIGN KEY (notification_id) REFERENCES core.notifications(id) ON DELETE SET NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 006_home_visits_technician_ops.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 007_clinical_fibroscan_labs_reports.sql
-- -----------------------------------------------------------------------------
-- 007: Liver Fibrosis Scan, lab tests, blood samples, lab results, and report files.

BEGIN;

CREATE TABLE clinical.fibroscan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  liver_stiffness_kpa numeric(5,2) NOT NULL,
  cap_dbm numeric(6,2),
  iqr_median_percent numeric(5,2),
  valid_measurements int,
  total_measurements int,
  fibrosis_stage clinical.fibrosis_stage_enum NOT NULL DEFAULT 'unknown',
  steatosis_grade clinical.steatosis_grade_enum NOT NULL DEFAULT 'unknown',
  machine_serial varchar(120),
  report_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fibroscan_kpa_chk CHECK (liver_stiffness_kpa > 0),
  CONSTRAINT fibroscan_iqr_chk CHECK (iqr_median_percent IS NULL OR iqr_median_percent >= 0),
  CONSTRAINT fibroscan_measurements_chk CHECK (
    valid_measurements IS NULL OR total_measurements IS NULL OR
    (valid_measurements >= 0 AND total_measurements >= valid_measurements)
  )
);

CREATE TABLE clinical.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  unit varchar(40),
  normal_min numeric(12,4),
  normal_max numeric(12,4),
  category clinical.lab_category_enum NOT NULL DEFAULT 'other',
  sort_order int NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_tests_range_chk CHECK (normal_min IS NULL OR normal_max IS NULL OR normal_min <= normal_max)
);

CREATE TABLE clinical.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  ordered_by core.recommendation_source_enum NOT NULL DEFAULT 'doctor',
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  lab_partner_id uuid REFERENCES operations.lab_partners(id) ON DELETE SET NULL,
  status operations.sample_status_enum NOT NULL DEFAULT 'pending',
  sample_collected_at timestamptz,
  report_uploaded_at timestamptz,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lab_orders_updated_at
BEFORE UPDATE ON clinical.lab_orders
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  lab_test_id uuid NOT NULL REFERENCES clinical.lab_tests(id) ON DELETE RESTRICT,
  result_value numeric(12,4),
  result_text varchar(255),
  unit varchar(40),
  reference_range varchar(120),
  flag clinical.lab_flag_enum NOT NULL DEFAULT 'unknown',
  resulted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_order_id, lab_test_id)
);

CREATE TABLE clinical.lab_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  sample_code varchar(80) NOT NULL UNIQUE,
  sample_type varchar(80) NOT NULL,
  tubes_count int,
  collected_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  collected_at timestamptz,
  courier_tracking_code varchar(120),
  status operations.sample_status_enum NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_samples_tubes_chk CHECK (tubes_count IS NULL OR tubes_count >= 0)
);

CREATE TABLE clinical.lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid NOT NULL REFERENCES clinical.lab_orders(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  report_date date,
  uploaded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 008_ai_assessment_prescription_review.sql
-- -----------------------------------------------------------------------------
-- 008: AI assessments, recommendations, safety flags, prescriptions, versions, items, reviews, signatures.

BEGIN;

CREATE TABLE ai.ai_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  trigger_type ai.trigger_type_enum NOT NULL,
  input_snapshot jsonb NOT NULL,
  model_name varchar(120) NOT NULL,
  model_version varchar(80) NOT NULL,
  risk_score numeric(8,2),
  risk_category clinical.risk_category_enum,
  diagnosis_summary text,
  package_recommendation_id uuid REFERENCES core.care_packages(id) ON DELETE SET NULL,
  improvement_prediction jsonb NOT NULL DEFAULT '{}'::jsonb,
  worsening_alert boolean NOT NULL DEFAULT false,
  status ai.assessment_status_enum NOT NULL DEFAULT 'generated',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE core.patient_packages
  ADD CONSTRAINT fk_patient_packages_ai_assessment
  FOREIGN KEY (ai_assessment_id) REFERENCES ai.ai_assessments(id) ON DELETE SET NULL;

CREATE TABLE ai.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_assessment_id uuid NOT NULL REFERENCES ai.ai_assessments(id) ON DELETE CASCADE,
  recommendation_type ai.recommendation_type_enum NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  confidence_score numeric(5,2),
  severity ai.severity_enum NOT NULL DEFAULT 'info',
  requires_doctor_approval boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_recommendations_confidence_chk CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

CREATE TABLE ai.ai_safety_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  flag_type ai.flag_type_enum NOT NULL,
  message text NOT NULL,
  priority ai.flag_priority_enum NOT NULL DEFAULT 'medium',
  status ai.flag_status_enum NOT NULL DEFAULT 'open',
  assigned_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  acknowledged_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.doctor_patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  UNIQUE (doctor_id, patient_id)
);

CREATE TABLE clinical.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  prescription_type clinical.prescription_type_enum NOT NULL DEFAULT 'ai_draft',
  diagnosis text,
  diet_plan text,
  exercise_plan text,
  monitoring_plan text,
  status clinical.prescription_status_enum NOT NULL DEFAULT 'pending_doctor_review',
  doctor_notes text,
  signed_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescriptions_ai_draft_not_approved_chk CHECK (
    prescription_type <> 'ai_draft' OR status NOT IN ('approved')
  ),
  CONSTRAINT prescriptions_doctor_final_requires_doctor_chk CHECK (
    prescription_type <> 'doctor_final' OR doctor_id IS NOT NULL
  ),
  CONSTRAINT prescriptions_approved_requires_signature_chk CHECK (
    status <> 'approved' OR (prescription_type = 'doctor_final' AND doctor_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON clinical.prescriptions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE clinical.prescription_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  snapshot jsonb NOT NULL,
  edited_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  edit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id, version_number)
);

CREATE TABLE clinical.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  item_type clinical.prescription_item_type_enum NOT NULL,
  product_id uuid,
  name varchar(180) NOT NULL,
  dosage varchar(120),
  frequency varchar(120),
  duration_days int,
  instructions text,
  is_substitutable boolean NOT NULL DEFAULT false,
  source core.recommendation_source_enum NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_items_duration_chk CHECK (duration_days IS NULL OR duration_days > 0)
);

CREATE TABLE clinical.doctor_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  action clinical.doctor_review_action_enum NOT NULL,
  notes text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical.digital_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  signature_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  registration_number varchar(120) NOT NULL,
  signed_hash varchar(128),
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 009_patient_scores_checkins_trends.sql
-- -----------------------------------------------------------------------------
-- 009: Patient scores, daily dashboard snapshots, and weekly check-ins.

BEGIN;

CREATE TABLE clinical.patient_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  source clinical.health_score_source_enum NOT NULL DEFAULT 'system',
  ai_assessment_id uuid REFERENCES ai.ai_assessments(id) ON DELETE SET NULL,
  liver_score numeric(5,2),
  color_code clinical.score_color_enum,
  compliance_score numeric(5,2),
  risk_score numeric(8,2),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_scores_range_chk CHECK (
    (liver_score IS NULL OR (liver_score >= 0 AND liver_score <= 100)) AND
    (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100))
  )
);

CREATE TABLE clinical.health_metric_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  weight_kg numeric(5,2),
  bmi numeric(5,2),
  sgpt numeric(10,2),
  sgot numeric(10,2),
  hba1c numeric(6,2),
  triglycerides numeric(10,2),
  fibroscan_kpa numeric(5,2),
  cap_dbm numeric(6,2),
  liver_score numeric(5,2),
  compliance_score numeric(5,2),
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, snapshot_date)
);

CREATE TABLE clinical.patient_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  checkin_week_start date NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  diet_compliance_percent int,
  exercise_compliance_percent int,
  medicine_compliance_percent int,
  alcohol_intake clinical.alcohol_intake_enum NOT NULL DEFAULT 'unknown',
  symptoms jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  ai_recalculated_score numeric(5,2),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, checkin_week_start),
  CONSTRAINT patient_checkins_weight_chk CHECK (weight_kg > 0),
  CONSTRAINT patient_checkins_compliance_chk CHECK (
    (diet_compliance_percent IS NULL OR diet_compliance_percent BETWEEN 0 AND 100) AND
    (exercise_compliance_percent IS NULL OR exercise_compliance_percent BETWEEN 0 AND 100) AND
    (medicine_compliance_percent IS NULL OR medicine_compliance_percent BETWEEN 0 AND 100)
  )
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 010_care_team_consults_chat.sql
-- -----------------------------------------------------------------------------
-- 010: Care team assignments, automated follow-up tasks, consults, chat, emergency queries, escalations.

BEGIN;

CREATE TABLE care.care_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  care_team_member_id uuid NOT NULL REFERENCES care.care_team_members(id) ON DELETE CASCADE,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  UNIQUE (patient_id, care_team_member_id, patient_package_id)
);

CREATE TABLE care.care_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  task_type care.task_type_enum NOT NULL,
  due_date date NOT NULL,
  status care.task_status_enum NOT NULL DEFAULT 'pending',
  notes text,
  completed_at timestamptz,
  escalated_to_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_care_tasks_updated_at
BEFORE UPDATE ON care.care_tasks
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE care.care_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  note_type care.note_type_enum NOT NULL,
  note text NOT NULL,
  escalation_required boolean NOT NULL DEFAULT false,
  visible_to_patient boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE care.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  care_team_member_id uuid REFERENCES care.care_team_members(id) ON DELETE SET NULL,
  consultation_type care.consultation_type_enum NOT NULL,
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  status care.consultation_status_enum NOT NULL DEFAULT 'scheduled',
  meeting_url text,
  summary text,
  recording_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultations_time_chk CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE TRIGGER trg_consultations_updated_at
BEFORE UPDATE ON care.consultations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE care.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  thread_type care.thread_type_enum NOT NULL,
  status care.thread_status_enum NOT NULL DEFAULT 'open',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE care.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES care.chat_threads(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  message text,
  attachment_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_content_chk CHECK (message IS NOT NULL OR attachment_file_id IS NOT NULL)
);

CREATE TABLE care.emergency_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES care.chat_threads(id) ON DELETE SET NULL,
  assigned_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  priority ai.flag_priority_enum NOT NULL DEFAULT 'urgent',
  reason text NOT NULL,
  status care.emergency_status_enum NOT NULL DEFAULT 'open',
  target_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE care.doctor_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  source_task_id uuid REFERENCES care.care_tasks(id) ON DELETE SET NULL,
  source_note_id uuid REFERENCES care.care_notes(id) ON DELETE SET NULL,
  assigned_doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status ai.flag_status_enum NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 011_pharmacy_orders_delivery.sql
-- -----------------------------------------------------------------------------
-- 011: Pharmacy catalog, inventory, carts, orders, payments, invoices, delivery tracking, refills.

BEGIN;

CREATE TABLE commerce.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES commerce.product_categories(id) ON DELETE SET NULL,
  code varchar(80) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES commerce.product_categories(id) ON DELETE SET NULL,
  sku varchar(80) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  product_type commerce.product_type_enum NOT NULL,
  requires_prescription boolean NOT NULL DEFAULT false,
  description text,
  strength varchar(80),
  pack_size varchar(80),
  manufacturer varchar(160),
  price numeric(12,2) NOT NULL DEFAULT 0,
  gst_percent numeric(5,2) NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_price_chk CHECK (price >= 0),
  CONSTRAINT products_gst_chk CHECK (gst_percent >= 0 AND gst_percent <= 100)
);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON commerce.products
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE clinical.prescription_items
  ADD CONSTRAINT fk_prescription_items_product
  FOREIGN KEY (product_id) REFERENCES commerce.products(id) ON DELETE SET NULL;

CREATE TABLE commerce.product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  quantity_on_hand int NOT NULL DEFAULT 0,
  quantity_reserved int NOT NULL DEFAULT 0,
  reorder_level int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, clinic_id, city_id),
  CONSTRAINT product_inventory_qty_chk CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND reorder_level >= 0)
);

CREATE TABLE commerce.product_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES commerce.product_inventory(id) ON DELETE CASCADE,
  movement_type commerce.inventory_movement_type_enum NOT NULL,
  quantity int NOT NULL,
  reason text,
  reference_type varchar(80),
  reference_id uuid,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_inventory_movements_qty_chk CHECK (quantity <> 0)
);

CREATE TABLE commerce.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE ON commerce.carts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES commerce.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE RESTRICT,
  prescription_item_id uuid REFERENCES clinical.prescription_items(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, prescription_item_id),
  CONSTRAINT cart_items_qty_chk CHECK (quantity > 0),
  CONSTRAINT cart_items_price_chk CHECK (unit_price >= 0)
);

CREATE TABLE commerce.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE SET NULL,
  order_number varchar(80) NOT NULL UNIQUE,
  order_status commerce.order_status_enum NOT NULL DEFAULT 'placed',
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status commerce.payment_status_enum NOT NULL DEFAULT 'created',
  delivery_status commerce.delivery_status_enum NOT NULL DEFAULT 'pending',
  delivery_address_id uuid NOT NULL REFERENCES clinical.patient_addresses(id) ON DELETE RESTRICT,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_amount_chk CHECK (
    subtotal_amount >= 0 AND tax_amount >= 0 AND delivery_fee >= 0 AND
    discount_amount >= 0 AND total_amount >= 0
  )
);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON commerce.orders
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE RESTRICT,
  prescription_item_id uuid REFERENCES clinical.prescription_items(id) ON DELETE SET NULL,
  quantity int NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_qty_chk CHECK (quantity > 0),
  CONSTRAINT order_items_price_chk CHECK (unit_price >= 0 AND tax_amount >= 0 AND total_price >= 0)
);

CREATE TABLE commerce.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  order_id uuid REFERENCES commerce.orders(id) ON DELETE SET NULL,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  provider commerce.payment_provider_enum NOT NULL DEFAULT 'manual',
  provider_payment_id varchar(180),
  provider_order_id varchar(180),
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR',
  status commerce.payment_status_enum NOT NULL DEFAULT 'created',
  paid_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_chk CHECK (amount >= 0)
);

CREATE TABLE commerce.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES commerce.orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES commerce.payments(id) ON DELETE SET NULL,
  invoice_number varchar(80) NOT NULL UNIQUE,
  invoice_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  status commerce.invoice_status_enum NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  courier_name varchar(120),
  tracking_number varchar(120),
  tracking_url text,
  status commerce.delivery_status_enum NOT NULL DEFAULT 'pending',
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_deliveries_updated_at
BEFORE UPDATE ON commerce.deliveries
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.refill_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES commerce.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  refill_every_days int NOT NULL,
  next_refill_date date NOT NULL,
  status commerce.refill_status_enum NOT NULL DEFAULT 'active',
  auto_deliver boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refill_schedules_qty_chk CHECK (quantity > 0 AND refill_every_days > 0)
);

CREATE TRIGGER trg_refill_schedules_updated_at
BEFORE UPDATE ON commerce.refill_schedules
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;

-- -----------------------------------------------------------------------------
-- 012_files_consent_legal_audit.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 013_indexes_views_seed_data.sql
-- -----------------------------------------------------------------------------
-- 013: High-traffic indexes, API-friendly views, and reference seed data.

BEGIN;

-- Fast lookup indexes for application APIs.
CREATE INDEX IF NOT EXISTS idx_users_mobile ON identity.users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON identity.users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON identity.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON identity.user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON clinical.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_doctor ON clinical.patients(primary_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_city ON clinical.patients(city_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_patient_status ON core.patient_packages(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_packages_package_status ON core.patient_packages(package_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_addresses_patient ON clinical.patient_addresses(patient_id);

CREATE INDEX IF NOT EXISTS idx_home_visits_technician_date ON operations.home_visits(technician_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_home_visits_patient ON operations.home_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_home_visits_status_date ON operations.home_visits(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visit_checklist_visit ON operations.visit_checklist_items(visit_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_status ON clinical.lab_orders(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_test ON clinical.lab_order_items(lab_test_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_order_status ON clinical.lab_samples(lab_order_id, status);
CREATE INDEX IF NOT EXISTS idx_fibroscan_patient_date ON clinical.fibroscan_results(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_scores_patient_date ON clinical.patient_health_scores(patient_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_patient_date ON clinical.health_metric_daily_snapshots(patient_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_patient_week ON clinical.patient_checkins(patient_id, checkin_week_start DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status ON clinical.prescriptions(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_status ON clinical.prescriptions(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_patient_status ON ai.ai_assessments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_safety_flags_patient_status ON ai.ai_safety_flags(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_safety_flags_doctor_status ON ai.ai_safety_flags(assigned_doctor_id, status);

CREATE INDEX IF NOT EXISTS idx_care_tasks_assignee_due ON care.care_tasks(assigned_to, due_date, status);
CREATE INDEX IF NOT EXISTS idx_care_tasks_patient_due ON care.care_tasks(patient_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_patient_status ON care.chat_threads(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_date ON care.chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date ON care.consultations(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_date ON care.consultations(doctor_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_patient_status ON commerce.orders(patient_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON commerce.orders(payment_status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_patient_status ON commerce.payments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_refill_patient_due ON commerce.refill_schedules(patient_id, next_refill_date, status);

CREATE INDEX IF NOT EXISTS idx_files_owner_type ON storage.files(owner_user_id, file_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_patient_date ON audit.access_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit.audit_logs(entity_type, entity_id, created_at DESC);

-- Patient dashboard: one row per patient for the main web dashboard.
CREATE OR REPLACE VIEW clinical.patient_dashboard_summary AS
SELECT
  p.id AS patient_id,
  p.patient_code,
  u.full_name,
  p.city_id,
  p.primary_doctor_id,
  p.height_cm,
  p.current_weight_kg,
  p.bmi,
  hs.liver_score,
  hs.color_code,
  hs.compliance_score,
  hs.risk_score,
  hs.calculated_at AS score_calculated_at,
  fs.liver_stiffness_kpa AS latest_fibroscan_kpa,
  fs.cap_dbm AS latest_cap_dbm,
  fs.fibrosis_stage,
  fs.steatosis_grade,
  fs.recorded_at AS latest_fibroscan_at,
  snap.sgpt,
  snap.sgot,
  snap.hba1c,
  snap.triglycerides,
  chk.checkin_week_start AS latest_checkin_week,
  chk.diet_compliance_percent,
  chk.exercise_compliance_percent,
  chk.medicine_compliance_percent,
  pp.id AS active_patient_package_id,
  cp.name AS active_package_name,
  pp.start_date,
  pp.end_date
FROM clinical.patients p
JOIN identity.users u ON u.id = p.user_id
LEFT JOIN LATERAL (
  SELECT *
  FROM clinical.patient_health_scores s
  WHERE s.patient_id = p.id
  ORDER BY s.calculated_at DESC
  LIMIT 1
) hs ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM clinical.fibroscan_results f
  WHERE f.patient_id = p.id
  ORDER BY f.recorded_at DESC
  LIMIT 1
) fs ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM clinical.health_metric_daily_snapshots d
  WHERE d.patient_id = p.id
  ORDER BY d.snapshot_date DESC
  LIMIT 1
) snap ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM clinical.patient_checkins c
  WHERE c.patient_id = p.id
  ORDER BY c.checkin_week_start DESC
  LIMIT 1
) chk ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM core.patient_packages pkg
  WHERE pkg.patient_id = p.id AND pkg.status = 'active'
  ORDER BY pkg.start_date DESC NULLS LAST, pkg.created_at DESC
  LIMIT 1
) pp ON true
LEFT JOIN core.care_packages cp ON cp.id = pp.package_id;

CREATE OR REPLACE VIEW clinical.patient_trends AS
SELECT
  patient_id,
  snapshot_date,
  weight_kg,
  bmi,
  sgpt,
  sgot,
  hba1c,
  triglycerides,
  fibroscan_kpa,
  cap_dbm,
  liver_score,
  compliance_score
FROM clinical.health_metric_daily_snapshots;

CREATE OR REPLACE VIEW clinical.patient_reports AS
SELECT
  por.patient_id,
  'old_report'::text AS report_kind,
  por.report_date,
  f.id AS file_id,
  f.file_name,
  f.mime_type,
  f.storage_url,
  f.file_size_bytes,
  por.created_at
FROM clinical.patient_old_reports por
JOIN storage.files f ON f.id = por.file_id
UNION ALL
SELECT
  lo.patient_id,
  'lab_report'::text AS report_kind,
  lr.report_date,
  f.id AS file_id,
  f.file_name,
  f.mime_type,
  f.storage_url,
  f.file_size_bytes,
  lr.created_at
FROM clinical.lab_reports lr
JOIN clinical.lab_orders lo ON lo.id = lr.lab_order_id
JOIN storage.files f ON f.id = lr.file_id
UNION ALL
SELECT
  fr.patient_id,
  'fibroscan_report'::text AS report_kind,
  fr.recorded_at::date AS report_date,
  f.id AS file_id,
  f.file_name,
  f.mime_type,
  f.storage_url,
  f.file_size_bytes,
  fr.created_at
FROM clinical.fibroscan_results fr
JOIN storage.files f ON f.id = fr.report_file_id;

CREATE OR REPLACE VIEW clinical.patient_visible_prescriptions AS
SELECT *
FROM clinical.prescriptions
WHERE status = 'approved'
  AND prescription_type = 'doctor_final';

CREATE OR REPLACE VIEW clinical.doctor_patient_summary AS
SELECT
  dpa.doctor_id,
  pds.*
FROM clinical.doctor_patient_assignments dpa
JOIN clinical.patient_dashboard_summary pds ON pds.patient_id = dpa.patient_id
WHERE dpa.status = 'active';

CREATE OR REPLACE VIEW clinical.doctor_pending_prescriptions AS
SELECT
  pr.id AS prescription_id,
  pr.patient_id,
  p.patient_code,
  u.full_name AS patient_name,
  pr.doctor_id,
  pr.ai_assessment_id,
  pr.diagnosis,
  pr.status,
  pr.created_at
FROM clinical.prescriptions pr
JOIN clinical.patients p ON p.id = pr.patient_id
JOIN identity.users u ON u.id = p.user_id
WHERE pr.status = 'pending_doctor_review';

CREATE OR REPLACE VIEW clinical.doctor_flagged_patients AS
SELECT
  sf.id AS safety_flag_id,
  sf.assigned_doctor_id AS doctor_id,
  sf.patient_id,
  p.patient_code,
  u.full_name AS patient_name,
  sf.flag_type,
  sf.priority,
  sf.status,
  sf.message,
  sf.created_at
FROM ai.ai_safety_flags sf
JOIN clinical.patients p ON p.id = sf.patient_id
JOIN identity.users u ON u.id = p.user_id
WHERE sf.status IN ('open', 'acknowledged');

CREATE OR REPLACE VIEW operations.technician_today_visits AS
SELECT
  hv.id AS visit_id,
  hv.technician_id,
  hv.patient_id,
  p.patient_code,
  u.full_name AS patient_name,
  pa.line1,
  pa.line2,
  pa.pincode,
  c.name AS city_name,
  hv.visit_type,
  hv.scheduled_at,
  hv.started_at,
  hv.completed_at,
  hv.status,
  pp.id AS patient_package_id,
  cp.name AS package_name
FROM operations.home_visits hv
JOIN clinical.patients p ON p.id = hv.patient_id
JOIN identity.users u ON u.id = p.user_id
JOIN clinical.patient_addresses pa ON pa.id = hv.address_id
LEFT JOIN core.cities c ON c.id = pa.city_id
LEFT JOIN core.patient_packages pp ON pp.id = hv.patient_package_id
LEFT JOIN core.care_packages cp ON cp.id = pp.package_id
WHERE hv.scheduled_at::date = CURRENT_DATE;

CREATE OR REPLACE VIEW core.admin_revenue_kpis AS
SELECT
  CURRENT_DATE AS snapshot_date,
  p.city_id,
  COUNT(DISTINCT p.id) AS total_patients,
  COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'active') AS active_packages,
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status = 'paid'
      AND pay.paid_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS month_revenue,
  COUNT(DISTINCT pp.id) FILTER (WHERE pp.status IN ('cancelled', 'expired'))::numeric
    / NULLIF(COUNT(DISTINCT pp.id), 0) * 100 AS dropout_rate,
  AVG(po.improvement_percent) AS avg_improvement_score
FROM clinical.patients p
LEFT JOIN core.patient_packages pp ON pp.patient_id = p.id
LEFT JOIN commerce.payments pay ON pay.patient_package_id = pp.id
LEFT JOIN core.package_outcomes po ON po.patient_package_id = pp.id
GROUP BY p.city_id;

CREATE OR REPLACE VIEW core.admin_package_performance AS
SELECT
  cp.id AS package_id,
  cp.name AS package_name,
  COUNT(pp.id) AS enrollments,
  COUNT(pp.id) FILTER (WHERE pp.status = 'active') AS active_count,
  COUNT(pp.id) FILTER (WHERE pp.status = 'completed') AS completed_count,
  COUNT(pp.id) FILTER (WHERE pp.status IN ('cancelled', 'expired')) AS dropout_count,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS revenue,
  AVG(po.improvement_percent) AS avg_improvement_percent
FROM core.care_packages cp
LEFT JOIN core.patient_packages pp ON pp.package_id = cp.id
LEFT JOIN commerce.payments pay ON pay.patient_package_id = pp.id
LEFT JOIN core.package_outcomes po ON po.patient_package_id = pp.id
GROUP BY cp.id, cp.name;

CREATE OR REPLACE VIEW core.admin_city_performance AS
SELECT
  c.id AS city_id,
  c.name AS city_name,
  c.state,
  COUNT(DISTINCT p.id) AS patients,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS revenue,
  AVG(po.improvement_percent) AS avg_improvement_percent,
  COUNT(DISTINCT hv.id) FILTER (WHERE hv.status = 'completed') AS completed_visits
FROM core.cities c
LEFT JOIN clinical.patients p ON p.city_id = c.id
LEFT JOIN core.patient_packages pp ON pp.patient_id = p.id
LEFT JOIN commerce.payments pay ON pay.patient_package_id = pp.id
LEFT JOIN core.package_outcomes po ON po.patient_package_id = pp.id
LEFT JOIN operations.home_visits hv ON hv.patient_id = p.id
GROUP BY c.id, c.name, c.state;

CREATE OR REPLACE VIEW core.admin_team_performance AS
SELECT
  'technician'::text AS team_type,
  t.user_id,
  u.full_name,
  t.city_id,
  COUNT(hv.id) FILTER (WHERE hv.status = 'completed') AS completed_work_count,
  NULL::numeric AS completed_task_rate,
  t.rating
FROM operations.technicians t
JOIN identity.users u ON u.id = t.user_id
LEFT JOIN operations.home_visits hv ON hv.technician_id = t.id
GROUP BY t.user_id, u.full_name, t.city_id, t.rating
UNION ALL
SELECT
  ctm.member_type::text AS team_type,
  ctm.user_id,
  u.full_name,
  ctm.city_id,
  COUNT(ct.id) FILTER (WHERE ct.status = 'completed') AS completed_work_count,
  COUNT(ct.id) FILTER (WHERE ct.status = 'completed')::numeric / NULLIF(COUNT(ct.id), 0) * 100 AS completed_task_rate,
  ctm.rating
FROM care.care_team_members ctm
JOIN identity.users u ON u.id = ctm.user_id
LEFT JOIN care.care_tasks ct ON ct.assigned_to = ctm.user_id
GROUP BY ctm.member_type, ctm.user_id, u.full_name, ctm.city_id, ctm.rating;

CREATE OR REPLACE VIEW commerce.patient_refill_due AS
SELECT
  rs.id AS refill_schedule_id,
  rs.patient_id,
  rs.prescription_id,
  rs.product_id,
  p.name AS product_name,
  p.product_type,
  rs.quantity,
  rs.next_refill_date,
  rs.auto_deliver,
  rs.status
FROM commerce.refill_schedules rs
JOIN commerce.products p ON p.id = rs.product_id
WHERE rs.status = 'active'
  AND rs.next_refill_date <= CURRENT_DATE + INTERVAL '7 days';

-- Seed roles.
INSERT INTO identity.roles(code, name, description) VALUES
  ('patient', 'Patient', 'Patient portal user'),
  ('doctor', 'Doctor', 'Doctor dashboard user'),
  ('technician', 'Technician', 'Home visit and sample collection user'),
  ('admin', 'Admin', 'Operations and revenue administrator'),
  ('dietician', 'Dietician', 'Diet follow-up care-team member'),
  ('health_coach', 'Health Coach', 'Compliance and lifestyle follow-up care-team member'),
  ('pharmacy', 'Pharmacy', 'Pharmacy catalog and fulfillment user'),
  ('lab_partner', 'Lab Partner', 'Lab order and report processing user'),
  ('support', 'Support', 'Support and emergency query user')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Seed permissions.
INSERT INTO identity.permissions(code, description) VALUES
  ('patient.view_self', 'View own dashboard, reports, prescriptions, care team, orders'),
  ('patient.update_checkin', 'Submit weekly check-ins'),
  ('doctor.view_assigned_patient', 'View assigned patient clinical summaries'),
  ('doctor.approve_prescription', 'Edit, sign, and release prescriptions'),
  ('doctor.manage_flags', 'Acknowledge and resolve clinical safety flags'),
  ('technician.view_assigned_visit', 'View assigned technician visits'),
  ('technician.update_visit', 'Capture consent, vitals, Liver Fibrosis Scan, samples, and notes'),
  ('care.view_assigned_patient', 'View assigned care-team patients'),
  ('care.manage_tasks', 'Complete coach/dietician tasks and notes'),
  ('pharmacy.manage_orders', 'Manage products, refills, orders, delivery'),
  ('lab.manage_reports', 'Manage lab orders, samples, reports'),
  ('admin.view_revenue', 'View revenue and package analytics'),
  ('admin.manage_users', 'Manage users, roles, and assignments'),
  ('admin.view_operations', 'View operations, city, technician, and coach analytics'),
  ('audit.view_logs', 'View audit, access, and consent logs')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON
  (r.code = 'patient' AND p.code IN ('patient.view_self', 'patient.update_checkin')) OR
  (r.code = 'doctor' AND p.code IN ('doctor.view_assigned_patient', 'doctor.approve_prescription', 'doctor.manage_flags')) OR
  (r.code = 'technician' AND p.code IN ('technician.view_assigned_visit', 'technician.update_visit')) OR
  (r.code IN ('dietician', 'health_coach') AND p.code IN ('care.view_assigned_patient', 'care.manage_tasks')) OR
  (r.code = 'pharmacy' AND p.code IN ('pharmacy.manage_orders')) OR
  (r.code = 'lab_partner' AND p.code IN ('lab.manage_reports')) OR
  (r.code = 'support' AND p.code IN ('care.view_assigned_patient')) OR
  (r.code = 'admin' AND p.code IN ('admin.view_revenue', 'admin.manage_users', 'admin.view_operations', 'audit.view_logs'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 014_identity_username_auth.sql
-- -----------------------------------------------------------------------------
-- 014: Username-based authentication support.

BEGIN;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS username citext;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username
ON identity.users(username)
WHERE username IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 015_patient_journey.sql
-- -----------------------------------------------------------------------------
-- 015: Patient journey status tracking and onboarding questionnaire seeds.

BEGIN;

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS journey_status varchar(40) NOT NULL DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS journey_timestamps jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

UPDATE clinical.patients
SET registered_at = created_at
WHERE registered_at IS NULL;

-- Liver symptoms questionnaire
INSERT INTO clinical.questionnaires (code, title, version, status)
VALUES ('LIVER_SYMPTOMS', 'Liver Symptoms Questionnaire', '1.0', 'active')
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version, status = 'active';

INSERT INTO clinical.questionnaire_questions (questionnaire_id, question_text, question_type, options, risk_weight, sort_order, is_required)
SELECT q.id, v.question_text, v.question_type::clinical.question_type_enum, v.options::jsonb, v.risk_weight, v.sort_order, v.is_required
FROM clinical.questionnaires q
CROSS JOIN (VALUES
  ('Do you experience fatigue or low energy?', 'boolean', '[]', 2, 1, true),
  ('Do you have pain or discomfort in the upper right abdomen?', 'boolean', '[]', 3, 2, true),
  ('Have you noticed yellowing of eyes or skin (jaundice)?', 'boolean', '[]', 5, 3, true),
  ('Do you experience nausea or loss of appetite?', 'boolean', '[]', 2, 4, true),
  ('Have you had unexplained weight loss in the last 3 months?', 'boolean', '[]', 3, 5, true),
  ('Do you experience swelling in legs or abdomen?', 'boolean', '[]', 4, 6, true)
) AS v(question_text, question_type, options, risk_weight, sort_order, is_required)
WHERE q.code = 'LIVER_SYMPTOMS'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.questionnaire_questions qq WHERE qq.questionnaire_id = q.id
  );

-- Risk assessment questionnaire
INSERT INTO clinical.questionnaires (code, title, version, status)
VALUES ('LIVER_RISK', 'Liver Risk Assessment', '1.0', 'active')
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version, status = 'active';

INSERT INTO clinical.questionnaire_questions (questionnaire_id, question_text, question_type, options, risk_weight, sort_order, is_required)
SELECT q.id, v.question_text, v.question_type::clinical.question_type_enum, v.options::jsonb, v.risk_weight, v.sort_order, v.is_required
FROM clinical.questionnaires q
CROSS JOIN (VALUES
  ('Do you have NAFLD or fatty liver diagnosis?', 'boolean', '[]', 4, 1, true),
  ('What is your alcohol consumption?', 'single_choice', '[{"value":"never","label":"Never"},{"value":"occasional","label":"Occasional"},{"value":"regular","label":"Regular"},{"value":"stopped","label":"Stopped"}]', 5, 2, true),
  ('History of viral hepatitis (B or C)?', 'boolean', '[]', 6, 3, true),
  ('Do you have Type 2 diabetes?', 'boolean', '[]', 4, 4, true),
  ('Do you have high cholesterol or dyslipidemia?', 'boolean', '[]', 3, 5, true),
  ('Do you have hypertension?', 'boolean', '[]', 2, 6, true),
  ('Family history of liver disease?', 'boolean', '[]', 3, 7, true)
) AS v(question_text, question_type, options, risk_weight, sort_order, is_required)
WHERE q.code = 'LIVER_RISK'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.questionnaire_questions qq WHERE qq.questionnaire_id = q.id
  );

COMMIT;

-- -----------------------------------------------------------------------------
-- 016_auth_security_module.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 017_patient_management.sql
-- -----------------------------------------------------------------------------
-- 017: Patient management module — extended demographics, clinical histories, timeline.

BEGIN;

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS occupation varchar(120),
  ADD COLUMN IF NOT EXISTS marital_status varchar(40),
  ADD COLUMN IF NOT EXISTS waist_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS lifestyle_type varchar(40),
  ADD COLUMN IF NOT EXISTS food_preference varchar(40),
  ADD COLUMN IF NOT EXISTS sleep_pattern varchar(80),
  ADD COLUMN IF NOT EXISTS stress_level varchar(40),
  ADD COLUMN IF NOT EXISTS physical_activity_level varchar(40);

CREATE TABLE IF NOT EXISTS clinical.patient_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  condition_code varchar(80) NOT NULL,
  condition_name varchar(160) NOT NULL,
  is_present boolean NOT NULL DEFAULT false,
  year_diagnosed integer,
  current_status varchar(80),
  medication_ongoing boolean,
  treating_doctor varchar(160),
  control_status varchar(80),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, condition_code)
);

CREATE TRIGGER trg_patient_conditions_updated_at
BEFORE UPDATE ON clinical.patient_conditions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_liver_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES clinical.patients(id) ON DELETE CASCADE,
  fatty_liver jsonb NOT NULL DEFAULT '{}'::jsonb,
  fibrosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  cirrhosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  viral_hepatitis jsonb NOT NULL DEFAULT '{}'::jsonb,
  alcohol_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_liver_history_updated_at
BEFORE UPDATE ON clinical.patient_liver_history
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  medicine_name varchar(160) NOT NULL,
  dose varchar(80),
  frequency varchar(80),
  route varchar(40),
  start_date date,
  end_date date,
  prescribed_by varchar(160),
  purpose text,
  is_current boolean NOT NULL DEFAULT true,
  stop_reason text,
  side_effects text,
  compliance varchar(40),
  category varchar(60),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_medications_updated_at
BEFORE UPDATE ON clinical.patient_medications
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  allergy_type varchar(40) NOT NULL,
  allergen_name varchar(160) NOT NULL,
  reaction_type varchar(80),
  severity varchar(40),
  first_noticed date,
  treatment_required text,
  emergency_history boolean NOT NULL DEFAULT false,
  alert_flag boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_allergies_updated_at
BEFORE UPDATE ON clinical.patient_allergies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  surgery_name varchar(160) NOT NULL,
  surgery_date date,
  hospital_name varchar(160),
  surgeon_name varchar(160),
  reason text,
  complications text,
  is_liver_related boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_surgeries_updated_at
BEFORE UPDATE ON clinical.patient_surgeries
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  vaccine_name varchar(120) NOT NULL,
  dose_number integer,
  vaccination_date date,
  next_due_date date,
  status varchar(40) NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_vaccinations_updated_at
BEFORE UPDATE ON clinical.patient_vaccinations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS clinical.patient_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  event_category varchar(60) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  actor_role varchar(40),
  related_entity_type varchar(60),
  related_entity_id uuid,
  status varchar(40),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_date
  ON clinical.patient_timeline_events(patient_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_medications_patient
  ON clinical.patient_medications(patient_id, is_current DESC);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient
  ON clinical.patient_allergies(patient_id) WHERE alert_flag = true;

COMMIT;

-- -----------------------------------------------------------------------------
-- 018_appointments_module.sql
-- -----------------------------------------------------------------------------
-- 018: Appointments module — booking notes, time slots, status timeline.

BEGIN;

ALTER TABLE operations.home_visits
  ADD COLUMN IF NOT EXISTS patient_notes text,
  ADD COLUMN IF NOT EXISTS preferred_time_slot varchar(20);

CREATE TABLE IF NOT EXISTS operations.appointment_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES operations.home_visits(id) ON DELETE CASCADE,
  status operations.visit_status_enum NOT NULL,
  step_code varchar(80),
  title varchar(160) NOT NULL,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_role varchar(40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_events_visit
  ON operations.appointment_status_events(visit_id, occurred_at ASC);

COMMIT;

-- -----------------------------------------------------------------------------
-- 019_clinical_reports.sql
-- -----------------------------------------------------------------------------
-- 019: Clinical report display codes for patient-facing report library.

BEGIN;

ALTER TABLE clinical.lab_reports
  ADD COLUMN IF NOT EXISTS report_code varchar(32);

ALTER TABLE clinical.patient_old_reports
  ADD COLUMN IF NOT EXISTS report_code varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_reports_report_code
  ON clinical.lab_reports(report_code) WHERE report_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_old_reports_report_code
  ON clinical.patient_old_reports(report_code) WHERE report_code IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 020_appointment_scheduling_core.sql
-- -----------------------------------------------------------------------------
-- 020: Unified RBAC appointment scheduling core (007-rbac-appointment-scheduling Phase 0)

BEGIN;

CREATE TYPE operations.appointment_visit_mode_enum AS ENUM ('home', 'clinic', 'tele');

CREATE TYPE operations.appointment_status_enum AS ENUM (
  'draft',
  'pending_payment',
  'booked',
  'confirmed',
  'doctor_assigned',
  'technician_assigned',
  'reminder_sent',
  'patient_confirmed',
  'technician_on_the_way',
  'technician_arrived',
  'sample_collected',
  'report_pending',
  'report_uploaded',
  'waiting_for_doctor',
  'consultation_started',
  'prescription_drafted',
  'prescription_approved',
  'completed',
  'rescheduled',
  'cancelled_by_patient',
  'cancelled_by_admin',
  'cancelled_by_doctor',
  'no_show',
  'missed',
  'follow_up_required',
  'closed'
);

CREATE TYPE operations.appointment_payment_status_enum AS ENUM (
  'unpaid',
  'pending',
  'paid',
  'refunded',
  'waived'
);

CREATE TYPE operations.appointment_slot_type_enum AS ENUM (
  'clinic',
  'tele',
  'home_review',
  'emergency'
);

CREATE TYPE operations.appointment_slot_status_enum AS ENUM (
  'open',
  'partial',
  'full',
  'blocked'
);

CREATE TABLE operations.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  requires_doctor boolean NOT NULL DEFAULT false,
  requires_technician boolean NOT NULL DEFAULT false,
  requires_equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  allows_home boolean NOT NULL DEFAULT false,
  allows_clinic boolean NOT NULL DEFAULT true,
  allows_tele boolean NOT NULL DEFAULT false,
  cancellation_window_hours int NOT NULL DEFAULT 24,
  reschedule_window_hours int NOT NULL DEFAULT 24,
  max_reschedules int NOT NULL DEFAULT 2,
  reminder_schedule jsonb NOT NULL DEFAULT '[1440,120,15]'::jsonb,
  default_follow_up_days int,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_types_duration_chk CHECK (duration_minutes > 0),
  CONSTRAINT appointment_types_price_chk CHECK (base_price >= 0)
);

CREATE TRIGGER trg_appointment_types_updated_at
BEFORE UPDATE ON operations.appointment_types
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS operations.appointment_code_seq START 1;

CREATE TABLE operations.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code varchar(32) NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  appointment_type_id uuid NOT NULL REFERENCES operations.appointment_types(id) ON DELETE RESTRICT,
  visit_mode operations.appointment_visit_mode_enum NOT NULL DEFAULT 'home',
  status operations.appointment_status_enum NOT NULL DEFAULT 'booked',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES operations.technicians(id) ON DELETE SET NULL,
  care_team_member_id uuid REFERENCES care.care_team_members(id) ON DELETE SET NULL,
  address_id uuid REFERENCES clinical.patient_addresses(id) ON DELETE SET NULL,
  legacy_home_visit_id uuid UNIQUE REFERENCES operations.home_visits(id) ON DELETE SET NULL,
  chief_complaint text,
  symptoms text,
  internal_notes text,
  tele_meeting_url text,
  tele_join_opens_at timestamptz,
  tele_join_closes_at timestamptz,
  payment_status operations.appointment_payment_status_enum NOT NULL DEFAULT 'unpaid',
  payment_amount numeric(12,2) NOT NULL DEFAULT 0,
  reschedule_count int NOT NULL DEFAULT 0,
  preferred_time_slot varchar(40),
  patient_notes text,
  assigned_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_time_chk CHECK (scheduled_end > scheduled_start),
  CONSTRAINT appointments_reschedule_count_chk CHECK (reschedule_count >= 0)
);

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON operations.appointments
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX idx_appointments_patient_start ON operations.appointments(patient_id, scheduled_start DESC);
CREATE INDEX idx_appointments_doctor_start ON operations.appointments(doctor_id, scheduled_start)
  WHERE doctor_id IS NOT NULL;
CREATE INDEX idx_appointments_technician_start ON operations.appointments(technician_id, scheduled_start)
  WHERE technician_id IS NOT NULL;
CREATE INDEX idx_appointments_status ON operations.appointments(status);
CREATE INDEX idx_appointments_scheduled_start ON operations.appointments(scheduled_start);

CREATE TABLE operations.appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  from_status operations.appointment_status_enum,
  to_status operations.appointment_status_enum NOT NULL,
  changed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  actor_role varchar(40) NOT NULL DEFAULT 'system',
  reason text,
  notes text,
  is_system_generated boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_status_history_appt
  ON operations.appointment_status_history(appointment_id, occurred_at ASC);

ALTER TABLE operations.home_visits
  ADD COLUMN IF NOT EXISTS appointment_id uuid UNIQUE
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

-- Configurable appointment types (007 spec §3)
INSERT INTO operations.appointment_types(
  code, name, duration_minutes, base_price,
  requires_doctor, requires_technician, requires_equipment,
  allows_home, allows_clinic, allows_tele,
  cancellation_window_hours, reschedule_window_hours, max_reschedules,
  default_follow_up_days
) VALUES
  ('home_visit', 'Home Visit', 90, 1499, false, true, '["Liver Fibrosis Scan"]'::jsonb, true, false, false, 24, 24, 2, 30),
  ('clinic_visit', 'Clinic Visit', 45, 799, true, false, '[]'::jsonb, false, true, false, 12, 12, 2, 30),
  ('teleconsultation', 'Teleconsultation', 30, 599, true, false, '[]'::jsonb, false, false, true, 6, 6, 2, 14),
  ('doctor_consultation', 'Doctor Consultation', 30, 999, true, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('fibroscan', 'Liver Fibrosis Scan Appointment', 45, 2499, false, true, '["Liver Fibrosis Scan"]'::jsonb, true, true, false, 24, 24, 2, 90),
  ('blood_sample_collection', 'Blood Sample Collection', 30, 499, false, true, '[]'::jsonb, true, true, false, 12, 12, 2, 30),
  ('dietician_consultation', 'Dietician Consultation', 45, 699, false, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('health_coach_follow_up', 'Health Coach Follow-up', 30, 0, false, false, '[]'::jsonb, false, true, true, 12, 12, 2, 30),
  ('package_follow_up', 'Package Follow-up Visit', 60, 0, true, true, '["Liver Fibrosis Scan"]'::jsonb, true, true, false, 24, 24, 2, 30),
  ('emergency_priority', 'Emergency / Priority Visit', 60, 1999, true, true, '[]'::jsonb, true, true, true, 2, 2, 1, 7)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_minutes = EXCLUDED.duration_minutes,
  base_price = EXCLUDED.base_price,
  requires_doctor = EXCLUDED.requires_doctor,
  requires_technician = EXCLUDED.requires_technician,
  allows_home = EXCLUDED.allows_home,
  allows_clinic = EXCLUDED.allows_clinic,
  allows_tele = EXCLUDED.allows_tele;

-- RBAC permissions (007 spec contracts)
INSERT INTO identity.permissions(code, description) VALUES
  ('appointment.book_own', 'Book own appointments'),
  ('appointment.view_own', 'View own appointments and timeline'),
  ('appointment.view_assigned', 'View assigned appointments'),
  ('appointment.view_all', 'View all clinic appointments'),
  ('appointment.manage_availability', 'Manage doctor availability and slots'),
  ('appointment.assign_staff', 'Assign or reassign doctors and technicians'),
  ('appointment.override_status', 'Override appointment status with audit'),
  ('appointment.manage_types', 'Manage appointment types and policies'),
  ('prescription.view_own_approved', 'View own approved prescriptions only')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON
  (r.code = 'patient' AND p.code IN ('appointment.book_own', 'appointment.view_own', 'prescription.view_own_approved')) OR
  (r.code = 'doctor' AND p.code IN ('appointment.view_assigned', 'appointment.manage_availability')) OR
  (r.code = 'technician' AND p.code IN ('appointment.view_assigned')) OR
  (r.code IN ('dietician', 'health_coach') AND p.code IN ('appointment.view_assigned', 'care.view_assigned_patient')) OR
  (r.code IN ('admin', 'support') AND p.code IN (
    'appointment.view_all', 'appointment.assign_staff', 'appointment.override_status', 'admin.view_operations'
  )) OR
  (r.code = 'admin' AND p.code IN ('appointment.manage_types'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Backfill unified appointments from existing home visits
INSERT INTO operations.appointments(
  appointment_code,
  patient_id,
  appointment_type_id,
  visit_mode,
  status,
  scheduled_start,
  scheduled_end,
  technician_id,
  address_id,
  legacy_home_visit_id,
  payment_status,
  payment_amount,
  preferred_time_slot,
  patient_notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  'APT-' || to_char(hv.created_at, 'YYYY') || '-' || lpad(nextval('operations.appointment_code_seq')::text, 5, '0'),
  hv.patient_id,
  at.id,
  'home'::operations.appointment_visit_mode_enum,
  CASE hv.status
    WHEN 'booked' THEN 'booked'::operations.appointment_status_enum
    WHEN 'assigned' THEN 'technician_assigned'::operations.appointment_status_enum
    WHEN 'in_progress' THEN 'consultation_started'::operations.appointment_status_enum
    WHEN 'completed' THEN 'completed'::operations.appointment_status_enum
    WHEN 'cancelled' THEN 'cancelled_by_patient'::operations.appointment_status_enum
    WHEN 'rescheduled' THEN 'rescheduled'::operations.appointment_status_enum
    WHEN 'no_show' THEN 'no_show'::operations.appointment_status_enum
    ELSE 'booked'::operations.appointment_status_enum
  END,
  hv.scheduled_at,
  hv.scheduled_at + (COALESCE(at.duration_minutes, 90) || ' minutes')::interval,
  hv.technician_id,
  hv.address_id,
  hv.id,
  'unpaid'::operations.appointment_payment_status_enum,
  COALESCE(at.base_price, 0),
  hv.preferred_time_slot,
  hv.patient_notes,
  hv.created_by,
  hv.created_at,
  hv.updated_at
FROM operations.home_visits hv
JOIN operations.appointment_types at ON at.code = CASE hv.visit_type
  WHEN 'initial' THEN 'home_visit'
  WHEN 'followup' THEN 'package_follow_up'
  WHEN 'repeat_fibroscan' THEN 'fibroscan'
  WHEN 'blood_collection' THEN 'blood_sample_collection'
  WHEN 'package_completion' THEN 'package_follow_up'
  ELSE 'home_visit'
END
WHERE NOT EXISTS (
  SELECT 1 FROM operations.appointments a WHERE a.legacy_home_visit_id = hv.id
);

UPDATE operations.home_visits hv
SET appointment_id = a.id
FROM operations.appointments a
WHERE a.legacy_home_visit_id = hv.id
  AND hv.appointment_id IS NULL;

INSERT INTO operations.appointment_status_history(
  appointment_id, from_status, to_status, actor_role, reason, notes, is_system_generated, occurred_at
)
SELECT
  a.id,
  NULL,
  a.status,
  'system',
  'migration_backfill',
  'Imported from home_visits',
  true,
  a.created_at
FROM operations.appointments a
WHERE NOT EXISTS (
  SELECT 1 FROM operations.appointment_status_history h
  WHERE h.appointment_id = a.id AND h.reason = 'migration_backfill'
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 021_appointment_availability.sql
-- -----------------------------------------------------------------------------
-- 021: Doctor availability, holidays, slots, internal notes (007 Phase 2)

BEGIN;

CREATE TABLE operations.doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes int NOT NULL DEFAULT 30,
  buffer_minutes int NOT NULL DEFAULT 0,
  max_appointments_per_day int,
  visit_modes jsonb NOT NULL DEFAULT '["clinic","tele"]'::jsonb,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_time_chk CHECK (end_time > start_time),
  CONSTRAINT doctor_availability_duration_chk CHECK (slot_duration_minutes > 0)
);

CREATE TRIGGER trg_doctor_availability_updated_at
BEFORE UPDATE ON operations.doctor_availability
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX idx_doctor_availability_doctor
  ON operations.doctor_availability(doctor_id, day_of_week)
  WHERE is_active = true;

CREATE TABLE operations.doctor_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_exceptions_time_chk CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX idx_doctor_availability_exceptions_doctor_date
  ON operations.doctor_availability_exceptions(doctor_id, exception_date);

CREATE TABLE operations.doctor_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  holiday_type varchar(40) NOT NULL DEFAULT 'leave',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_holidays_date_chk CHECK (end_date >= start_date)
);

CREATE INDEX idx_doctor_holidays_doctor_dates
  ON operations.doctor_holidays(doctor_id, start_date, end_date);

CREATE TABLE operations.appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_type operations.appointment_slot_type_enum NOT NULL DEFAULT 'clinic',
  status operations.appointment_slot_status_enum NOT NULL DEFAULT 'open',
  max_bookings int NOT NULL DEFAULT 1,
  current_bookings int NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  appointment_type_id uuid REFERENCES operations.appointment_types(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_slots_time_chk CHECK (end_time > start_time),
  CONSTRAINT appointment_slots_bookings_chk CHECK (current_bookings >= 0 AND max_bookings > 0)
);

CREATE TRIGGER trg_appointment_slots_updated_at
BEFORE UPDATE ON operations.appointment_slots
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE UNIQUE INDEX idx_appointment_slots_doctor_unique
  ON operations.appointment_slots(doctor_id, slot_date, start_time, slot_type)
  WHERE doctor_id IS NOT NULL AND is_blocked = false;

CREATE INDEX idx_appointment_slots_doctor_date
  ON operations.appointment_slots(doctor_id, slot_date)
  WHERE doctor_id IS NOT NULL;

CREATE TABLE operations.appointment_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_internal_notes_appt
  ON operations.appointment_internal_notes(appointment_id, created_at DESC);

COMMIT;

-- -----------------------------------------------------------------------------
-- 022_technician_geo_and_vitals_link.sql
-- -----------------------------------------------------------------------------
-- 022: Technician geo tracking + appointment links on field vitals (007 Phase 3)

BEGIN;

CREATE TYPE operations.geo_source_enum AS ENUM ('manual', 'gps');

CREATE TABLE operations.technician_geo_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  accuracy_m numeric(8, 2),
  source operations.geo_source_enum NOT NULL DEFAULT 'gps',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technician_geo_lat_chk CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT technician_geo_lng_chk CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_technician_geo_appointment_recorded
  ON operations.technician_geo_locations(appointment_id, recorded_at DESC);

CREATE INDEX idx_technician_geo_technician_recorded
  ON operations.technician_geo_locations(technician_id, recorded_at DESC);

ALTER TABLE operations.visit_vitals
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

UPDATE operations.visit_vitals vv
SET appointment_id = hv.appointment_id
FROM operations.home_visits hv
WHERE hv.id = vv.visit_id
  AND vv.appointment_id IS NULL
  AND hv.appointment_id IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 023_prescription_appointment_pdf.sql
-- -----------------------------------------------------------------------------
-- 023: Appointment-linked prescriptions + PDF storage (007 Phase 4)

BEGIN;

ALTER TABLE clinical.prescriptions
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chief_complaint text,
  ADD COLUMN IF NOT EXISTS supplements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lifestyle_advice jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_days int,
  ADD COLUMN IF NOT EXISTS prescription_number varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_appointment
  ON clinical.prescriptions(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE TABLE clinical.prescription_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES operations.appointments(id) ON DELETE SET NULL,
  pdf_file_id uuid NOT NULL REFERENCES storage.files(id) ON DELETE RESTRICT,
  prescription_number varchar(32) NOT NULL,
  qr_verification_code varchar(64) NOT NULL,
  qr_payload text NOT NULL,
  version_number int NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT prescription_pdfs_version_chk CHECK (version_number > 0)
);

CREATE UNIQUE INDEX idx_prescription_pdfs_current
  ON clinical.prescription_pdfs(prescription_id)
  WHERE is_current = true;

CREATE INDEX idx_prescription_pdfs_appointment
  ON clinical.prescription_pdfs(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS clinical.prescription_number_seq START 1001;

COMMIT;

-- -----------------------------------------------------------------------------
-- 024_admin_notifications_tele.sql
-- -----------------------------------------------------------------------------
-- 024: Admin ops, reminder logs, tele sessions, notification templates (007 Phase 5)

BEGIN;

CREATE TYPE operations.appointment_reminder_type_enum AS ENUM ('24h', '2h', '15m', 'custom');
CREATE TYPE operations.appointment_reminder_delivery_enum AS ENUM ('queued', 'sent', 'delivered', 'failed', 'skipped');

CREATE TABLE operations.appointment_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES operations.appointments(id) ON DELETE CASCADE,
  reminder_type operations.appointment_reminder_type_enum NOT NULL,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  recipient_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  template_code varchar(80) NOT NULL,
  status operations.appointment_reminder_delivery_enum NOT NULL DEFAULT 'queued',
  notification_id uuid REFERENCES core.notifications(id) ON DELETE SET NULL,
  sent_at timestamptz,
  delivery_status varchar(40),
  retry_count int NOT NULL DEFAULT 0,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_reminder_logs_retry_chk CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX uq_appointment_reminder_once
  ON operations.appointment_reminder_logs(appointment_id, reminder_type, channel);

CREATE INDEX idx_appointment_reminder_logs_appt
  ON operations.appointment_reminder_logs(appointment_id, created_at DESC);

CREATE TABLE operations.appointment_notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  subject_template text NOT NULL,
  body_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_appointment_notification_templates_updated_at
BEFORE UPDATE ON operations.appointment_notification_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.clinic_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(160) NOT NULL,
  holiday_type varchar(40) NOT NULL DEFAULT 'clinic',
  start_date date NOT NULL,
  end_date date NOT NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_holidays_date_chk CHECK (end_date >= start_date)
);

CREATE INDEX idx_clinic_holidays_dates ON operations.clinic_holidays(start_date, end_date);

CREATE TABLE operations.booking_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  appointment_type_id uuid REFERENCES operations.appointment_types(id) ON DELETE CASCADE,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  cancellation_window_hours int,
  reschedule_window_hours int,
  max_reschedules int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_booking_policies_updated_at
BEFORE UPDATE ON operations.booking_policies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.teleconsultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES operations.appointments(id) ON DELETE CASCADE,
  meeting_url text NOT NULL,
  meeting_provider varchar(40) NOT NULL DEFAULT 'livotale',
  patient_joined_at timestamptz,
  doctor_joined_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teleconsultation_sessions_updated_at
BEFORE UPDATE ON operations.teleconsultation_sessions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

INSERT INTO operations.appointment_notification_templates(code, name, channel, subject_template, body_template)
VALUES
  (
    'appointment_reminder_24h',
    'Appointment reminder 24h',
    'in_app',
    'Reminder: {{typeName}} tomorrow',
    'Your {{typeName}} is scheduled for {{scheduledAt}}. Please confirm or reschedule if needed.'
  ),
  (
    'appointment_reminder_2h',
    'Appointment reminder 2h',
    'in_app',
    'Reminder: {{typeName}} in 2 hours',
    'Your {{typeName}} starts at {{scheduledAt}}.'
  ),
  (
    'appointment_reminder_15m',
    'Appointment reminder 15m',
    'in_app',
    'Starting soon: {{typeName}}',
    'Your {{typeName}} begins in 15 minutes.'
  ),
  (
    'appointment_staff_assigned',
    'Staff assigned',
    'in_app',
    'Staff assigned to your appointment',
    'Your {{typeName}} on {{scheduledAt}} has been updated with assigned staff.'
  ),
  (
    'appointment_manual_reminder',
    'Manual reminder',
    'in_app',
    'Appointment reminder',
    'Reminder for your {{typeName}} on {{scheduledAt}}.'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;

COMMIT;

-- -----------------------------------------------------------------------------
-- 025_patient_timeline_appointment_link.sql
-- -----------------------------------------------------------------------------
-- 025: Patient timeline appointment linkage + care consultation link (007 Phase 6)

BEGIN;

ALTER TABLE clinical.patient_timeline_events
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_timeline_appointment
  ON clinical.patient_timeline_events(appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE care.consultations
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES operations.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_appointment
  ON care.consultations(appointment_id)
  WHERE appointment_id IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 026_sample_collection_lab_workflow.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 027_sample_collection_lab_integrity.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 028_technician_route_requests.sql
-- -----------------------------------------------------------------------------
-- 028: Technicians request unassigned orders; ops team approves routing

BEGIN;

CREATE TYPE operations.technician_route_request_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE operations.technician_route_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_collection_id uuid NOT NULL REFERENCES operations.sample_collections(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES operations.technicians(id) ON DELETE CASCADE,
  status operations.technician_route_request_status_enum NOT NULL DEFAULT 'pending',
  request_note text,
  reviewed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_route_request_pending_per_tech_sample
  ON operations.technician_route_requests (sample_collection_id, technician_id)
  WHERE status = 'pending';

CREATE INDEX idx_route_requests_status ON operations.technician_route_requests(status, requested_at DESC);
CREATE INDEX idx_route_requests_technician ON operations.technician_route_requests(technician_id, requested_at DESC);

CREATE TRIGGER trg_technician_route_requests_updated_at
BEFORE UPDATE ON operations.technician_route_requests
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;

-- -----------------------------------------------------------------------------
-- 029_technician_employee_profile.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 030_staff_hr_profiles.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 031_staff_onboarding_invites.sql
-- -----------------------------------------------------------------------------
-- 031: Staff onboarding invites — admin provision, self-register, inactive until verified

BEGIN;

CREATE TABLE operations.staff_onboarding_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) NOT NULL UNIQUE,
  role_key varchar(40) NOT NULL,
  full_name varchar(200) NOT NULL,
  email varchar(200),
  mobile varchar(20) NOT NULL,
  username varchar(80),
  member_id uuid,
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  status varchar(40) NOT NULL DEFAULT 'invited',
  profile_complete boolean NOT NULL DEFAULT false,
  verification_status varchar(40) NOT NULL DEFAULT 'pending',
  employment_status varchar(40) NOT NULL DEFAULT 'inactive',
  onboarding_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  link_sent_at timestamptz,
  registered_at timestamptz,
  profile_submitted_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_onboarding_invites_mobile ON operations.staff_onboarding_invites(mobile);
CREATE INDEX idx_staff_onboarding_invites_user ON operations.staff_onboarding_invites(user_id);

CREATE TRIGGER trg_staff_onboarding_invites_updated_at
BEFORE UPDATE ON operations.staff_onboarding_invites
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;

-- -----------------------------------------------------------------------------
-- 032_liver_care_platform_core.sql
-- -----------------------------------------------------------------------------
-- 032: Liver Care Platform — packages catalog, enquiries, service orders, payments.

BEGIN;

CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TYPE operations.enquiry_source_enum AS ENUM ('website', 'whatsapp', 'manual');
CREATE TYPE operations.enquiry_status_enum AS ENUM (
  'new', 'contacted', 'interested', 'not_interested',
  'follow_up_required', 'converted', 'closed'
);

CREATE TYPE commerce.liver_care_order_status_enum AS ENUM (
  'draft', 'created', 'payment_pending', 'payment_completed',
  'technician_assigned', 'scan_scheduled', 'scan_in_progress', 'scan_completed',
  'pathology_pending', 'lab_report_uploaded', 'ai_extraction_pending', 'ai_extraction_completed',
  'report_review_pending', 'final_report_generated', 'doctor_assignment_pending', 'doctor_assigned',
  'consultation_pending', 'prescription_pending', 'prescription_generated', 'completed', 'cancelled'
);

CREATE TYPE commerce.liver_care_payment_mode_enum AS ENUM ('offline', 'online_link', 'patient_portal');
CREATE TYPE commerce.liver_care_payment_status_enum AS ENUM (
  'pending', 'link_sent', 'processing', 'success', 'failed', 'refunded', 'cancelled'
);

CREATE TABLE commerce.liver_care_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  description text,
  price numeric(12,2) NOT NULL,
  discount_price numeric(12,2),
  includes jsonb NOT NULL DEFAULT '{"bullets":[]}'::jsonb,
  fibrosis_scan_included boolean NOT NULL DEFAULT true,
  pathology_included boolean NOT NULL DEFAULT false,
  consultation_included boolean NOT NULL DEFAULT false,
  visibility_web boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  terms_conditions text,
  recommended_tag boolean NOT NULL DEFAULT false,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT liver_care_packages_price_chk CHECK (price >= 0 AND (discount_price IS NULL OR discount_price >= 0))
);

CREATE TRIGGER trg_liver_care_packages_updated_at
BEFORE UPDATE ON commerce.liver_care_packages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE operations.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number varchar(40) NOT NULL UNIQUE,
  source operations.enquiry_source_enum NOT NULL,
  patient_name varchar(160) NOT NULL,
  phone varchar(20) NOT NULL,
  email varchar(160),
  age int,
  gender varchar(20),
  city varchar(100),
  address text,
  preferred_package_id uuid REFERENCES commerce.liver_care_packages(id) ON DELETE SET NULL,
  message text,
  enquiry_at timestamptz NOT NULL DEFAULT now(),
  assigned_executive_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  status operations.enquiry_status_enum NOT NULL DEFAULT 'new',
  follow_up_at timestamptz,
  internal_notes text,
  call_remarks text,
  patient_id uuid REFERENCES clinical.patients(id) ON DELETE SET NULL,
  order_id uuid,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER trg_enquiries_updated_at
BEFORE UPDATE ON operations.enquiries
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(40) NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE RESTRICT,
  enquiry_id uuid REFERENCES operations.enquiries(id) ON DELETE SET NULL,
  package_id uuid NOT NULL REFERENCES commerce.liver_care_packages(id) ON DELETE RESTRICT,
  package_name varchar(200) NOT NULL,
  package_price numeric(12,2) NOT NULL,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  final_amount numeric(12,2) NOT NULL,
  payment_mode commerce.liver_care_payment_mode_enum,
  payment_status commerce.liver_care_payment_status_enum NOT NULL DEFAULT 'pending',
  order_status commerce.liver_care_order_status_enum NOT NULL DEFAULT 'draft',
  technician_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  partner_lab_id uuid REFERENCES operations.lab_partners(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES clinical.doctors(id) ON DELETE SET NULL,
  scan_scheduled_at timestamptz,
  consultation_scheduled_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT service_orders_amount_chk CHECK (final_amount >= 0 AND discount >= 0)
);

CREATE TRIGGER trg_service_orders_updated_at
BEFORE UPDATE ON commerce.service_orders
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE operations.enquiries
  ADD CONSTRAINT fk_enquiries_order
  FOREIGN KEY (order_id) REFERENCES commerce.service_orders(id) ON DELETE SET NULL;

CREATE TABLE commerce.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method varchar(40),
  provider varchar(40) NOT NULL DEFAULT 'dummy',
  provider_payment_id varchar(120),
  transaction_ref varchar(120),
  status commerce.liver_care_payment_status_enum NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  collected_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  receipt_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_order_payments_updated_at
BEFORE UPDATE ON commerce.order_payments
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  url text NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_via jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.order_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  label varchar(200) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  performed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMIT;

-- -----------------------------------------------------------------------------
-- 033_liver_care_pathology_ai_reports.sql
-- -----------------------------------------------------------------------------
-- 033: Liver care pathology, AI extraction, reports, audit (extends 032)

-- Link fibroscan results to service orders
ALTER TABLE IF EXISTS clinical.fibroscan_results
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES commerce.service_orders(id);

CREATE INDEX IF NOT EXISTS idx_fibroscan_results_order_id
  ON clinical.fibroscan_results(order_id);

-- Lab report uploads
CREATE TABLE IF NOT EXISTS integrations.lab_report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  partner_lab_id uuid,
  file_name text NOT NULL,
  file_url text,
  file_id text,
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  extraction_status text NOT NULL DEFAULT 'not_started',
  final_status text NOT NULL DEFAULT 'pending',
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_report_uploads_order_id
  ON integrations.lab_report_uploads(order_id);

-- AI extraction jobs
CREATE TABLE IF NOT EXISTS integrations.ai_extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('pathology', 'fibrosis_scan')),
  source_file_id text,
  status text NOT NULL DEFAULT 'queued',
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations.extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES integrations.ai_extraction_jobs(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  extracted_value text,
  editable_value text,
  unit text,
  reference_range text,
  flag text DEFAULT 'normal',
  confidence_score numeric(5,4),
  source_page int,
  verified boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_extraction_jobs_order_id
  ON integrations.ai_extraction_jobs(order_id);

-- Final reports & templates
CREATE TABLE IF NOT EXISTS clinical.letterhead_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  html_body text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.final_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  report_type text NOT NULL,
  report_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  file_id text,
  generated_at timestamptz,
  published_at timestamptz,
  authorized_by text,
  version int NOT NULL DEFAULT 1,
  qr_code_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_final_reports_order_id
  ON clinical.final_reports(order_id);

-- Extend lab partners (profile fields)
ALTER TABLE IF EXISTS operations.lab_partners
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS contract_end date,
  ADD COLUMN IF NOT EXISTS supported_tests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;

-- Notifications & audit
CREATE TABLE IF NOT EXISTS integrations.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  template text,
  recipient text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  order_id uuid REFERENCES commerce.service_orders(id),
  patient_id uuid,
  trigger_event text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_order_id
  ON integrations.notifications_log(order_id);

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value text,
  new_value text,
  performed_by text NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit.audit_log(performed_at DESC);

-- -----------------------------------------------------------------------------
-- 034_enquiry_crm_order_extensions.sql
-- -----------------------------------------------------------------------------
-- 034: Enquiry CRM follow-up logs and order outcome fields.

BEGIN;

CREATE TABLE IF NOT EXISTS operations.enquiry_follow_up_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES operations.enquiries(id) ON DELETE CASCADE,
  status operations.enquiry_status_enum NOT NULL,
  internal_notes text,
  call_remarks text,
  follow_up_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiry_follow_up_logs_enquiry
  ON operations.enquiry_follow_up_logs(enquiry_id, created_at ASC);

ALTER TABLE operations.enquiries
  ADD COLUMN IF NOT EXISTS order_outcome varchar(40),
  ADD COLUMN IF NOT EXISTS order_outcome_remarks text;

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scan_time_slot varchar(80),
  ADD COLUMN IF NOT EXISTS scan_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_lab_order_ref varchar(120),
  ADD COLUMN IF NOT EXISTS pathology_time_slot varchar(80),
  ADD COLUMN IF NOT EXISTS pathology_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_scheduled_at timestamptz;

COMMIT;

-- -----------------------------------------------------------------------------
-- 034_liver_care_clinical_pipeline.sql
-- -----------------------------------------------------------------------------
-- 034: Liver care technician, pathology dispatch, consultation, and prescription pipeline

BEGIN;

CREATE TABLE IF NOT EXISTS operations.sample_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  partner_lab_id uuid REFERENCES operations.lab_partners(id),
  status text NOT NULL DEFAULT 'pending_dispatch',
  collected_at timestamptz,
  dispatched_at timestamptz,
  received_at_lab timestamptz,
  awaiting_report_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sample_dispatches_order_id ON operations.sample_dispatches(order_id);

CREATE TABLE IF NOT EXISTS operations.technician_order_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  technician_id uuid REFERENCES identity.users(id),
  visit_step text NOT NULL DEFAULT 'assigned',
  started_at timestamptz,
  reached_at timestamptz,
  completed_at timestamptz,
  unable_reason text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technician_order_visits_order_id ON operations.technician_order_visits(order_id);

CREATE TABLE IF NOT EXISTS clinical.scan_patient_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  patient_verified boolean NOT NULL DEFAULT false,
  fibroscan_intake_submitted boolean NOT NULL DEFAULT false,
  fibroscan_intake_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.fibrosis_scan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  lsm_kpa numeric,
  cap_db_m numeric,
  iqr numeric,
  probe_type text,
  device_serial text,
  fibrosis_stage text,
  steatosis_grade text,
  interpretation text,
  source text DEFAULT 'manual',
  locked boolean NOT NULL DEFAULT false,
  report_file_id uuid REFERENCES storage.files(id),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.order_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES commerce.service_orders(id),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL REFERENCES clinical.doctors(id),
  doctor_name varchar(200) NOT NULL,
  consultation_type varchar(40) NOT NULL DEFAULT 'video',
  scheduled_at timestamptz,
  meeting_link text,
  status varchar(60) NOT NULL DEFAULT 'doctor_assigned',
  doctor_notes text,
  symptoms text,
  visit_completed_at timestamptz,
  follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical.consultation_visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  consultation_id uuid NOT NULL REFERENCES clinical.order_consultations(id),
  visit_type varchar(40) NOT NULL DEFAULT 'initial',
  visit_number int NOT NULL DEFAULT 1,
  scheduled_at timestamptz,
  visit_completed_at timestamptz,
  follow_up_at timestamptz,
  symptoms text,
  doctor_notes text,
  status varchar(60) NOT NULL DEFAULT 'scheduled',
  prescription_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_visit_logs_order_id ON clinical.consultation_visit_logs(order_id);

CREATE TABLE IF NOT EXISTS clinical.liver_care_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.service_orders(id),
  visit_log_id uuid NOT NULL REFERENCES clinical.consultation_visit_logs(id),
  patient_id uuid NOT NULL,
  consultation_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  doctor_name varchar(200) NOT NULL,
  doctor_degree varchar(200),
  doctor_registration varchar(120),
  status varchar(40) NOT NULL DEFAULT 'draft',
  diagnosis text,
  clinical_notes text,
  symptoms text,
  visit_date timestamptz,
  follow_up_date timestamptz,
  medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  diet_advice text,
  lifestyle_advice text,
  follow_up_advice text,
  warning_signs text,
  pdf_url text,
  file_id text,
  published_at timestamptz,
  revision_of uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liver_care_prescriptions_order_id ON clinical.liver_care_prescriptions(order_id);

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS scan_time_slot varchar,
  ADD COLUMN IF NOT EXISTS scan_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_lab_order_ref varchar,
  ADD COLUMN IF NOT EXISTS pathology_time_slot varchar,
  ADD COLUMN IF NOT EXISTS pathology_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS pathology_scheduled_at timestamptz;

COMMIT;

-- -----------------------------------------------------------------------------
-- 035_service_zones.sql
-- -----------------------------------------------------------------------------
-- 035: Service zones for operations / technician coverage areas.

BEGIN;

CREATE TABLE IF NOT EXISTS operations.service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name varchar(120) NOT NULL,
  state_name varchar(80) NOT NULL,
  pincodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_service_zones_updated_at
BEFORE UPDATE ON operations.service_zones
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_zones_active ON operations.service_zones(active) WHERE active = true;

COMMIT;

-- -----------------------------------------------------------------------------
-- 036_activity_log_audit_indexes.sql
-- -----------------------------------------------------------------------------
-- 036: Indexes for filtering activity and login audit logs.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_date
  ON audit.activity_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON audit.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_logs_success_date
  ON identity.login_logs(success, created_at DESC);

COMMIT;

-- -----------------------------------------------------------------------------
-- 036_user_archive.sql
-- -----------------------------------------------------------------------------
-- 036: Staff user archive — status, audit trail, and assignment-check support.

BEGIN;

ALTER TYPE identity.user_status_enum ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES identity.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_archived_at
  ON identity.users (archived_at)
  WHERE archived_at IS NOT NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- 037_user_badge_id.sql
-- -----------------------------------------------------------------------------
-- 037: Human-readable Livotale user badge IDs (e.g. LVT-67997AD).

BEGIN;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS user_badge_id varchar(12);

CREATE OR REPLACE FUNCTION identity.generate_user_badge_id(user_uuid uuid)
RETURNS varchar(12)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'LVT-' || UPPER(SUBSTRING(REPLACE(user_uuid::text, '-', '') FROM 1 FOR 7));
$$;

UPDATE identity.users
SET user_badge_id = identity.generate_user_badge_id(id)
WHERE user_badge_id IS NULL OR user_badge_id = '';

ALTER TABLE identity.users
  ALTER COLUMN user_badge_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_badge_id
  ON identity.users(user_badge_id);

CREATE OR REPLACE FUNCTION identity.set_user_badge_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_badge_id IS NULL OR NEW.user_badge_id = '' THEN
    NEW.user_badge_id := identity.generate_user_badge_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_badge_id ON identity.users;
CREATE TRIGGER trg_users_badge_id
BEFORE INSERT ON identity.users
FOR EACH ROW
EXECUTE FUNCTION identity.set_user_badge_id();

COMMENT ON COLUMN identity.users.user_badge_id IS
  'Public-facing Livotale user badge shown in staff lists and profiles (LVT-XXXXXXX).';
COMMENT ON COLUMN identity.users.metadata IS
  'Extensible JSON for integrations; not used for core auth. Prefer user_badge_id for display IDs.';

COMMIT;

-- -----------------------------------------------------------------------------
-- 038_inbox_notifications.sql
-- -----------------------------------------------------------------------------
-- 038: Staff/patient in-app notification inbox and async outbox queue.

BEGIN;

CREATE TABLE IF NOT EXISTS audit.inbox_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL,
  recipient_id text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  order_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inbox_notifications_recipient_type_chk
    CHECK (recipient_type IN ('role', 'phone'))
);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_role
  ON audit.inbox_notifications(recipient_type, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_unread
  ON audit.inbox_notifications(recipient_type, recipient_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS audit.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  scope text NOT NULL,
  scope_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT notification_outbox_status_chk
    CHECK (status IN ('pending', 'processed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON audit.notification_outbox(status, created_at)
  WHERE status = 'pending';

COMMIT;

-- -----------------------------------------------------------------------------
-- 039_doctor_languages.sql
-- -----------------------------------------------------------------------------
-- 039: Doctor languages for consultation matching + patient preferred language

BEGIN;

ALTER TABLE clinical.doctors
  ADD COLUMN IF NOT EXISTS languages_known text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS preferred_language varchar(80);

CREATE INDEX IF NOT EXISTS idx_doctors_languages_known
  ON clinical.doctors USING gin (languages_known);

COMMIT;

-- -----------------------------------------------------------------------------
-- 040_user_bank_accounts.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 041_external_integrations_platform.sql
-- -----------------------------------------------------------------------------
-- 041: External integrations platform — settings, unified message templates, letterhead seed

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'integrations' AND t.typname = 'message_template_category_enum'
  ) THEN
    CREATE TYPE integrations.message_template_category_enum AS ENUM (
      'otp', 'enquiry', 'order', 'scan', 'lab', 'report', 'appointment', 'system'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS integrations.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  twilio_config_source text NOT NULL DEFAULT 'database' CHECK (twilio_config_source IN ('database', 'env')),
  twilio_account_sid varchar(64),
  twilio_auth_token_enc bytea,
  twilio_messaging_service_sid varchar(64),
  twilio_verify_service_sid varchar(64),
  sendgrid_config_source text NOT NULL DEFAULT 'database' CHECK (sendgrid_config_source IN ('database', 'env')),
  sendgrid_api_key_enc bytea,
  sendgrid_from_email varchar(320),
  sendgrid_from_name varchar(160),
  ai_config_source text NOT NULL DEFAULT 'database' CHECK (ai_config_source IN ('database', 'env')),
  ai_provider varchar(40),
  ai_api_key_enc bytea,
  ai_model varchar(120),
  ai_base_url text,
  s3_config_source text NOT NULL DEFAULT 'env' CHECK (s3_config_source IN ('database', 'env')),
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO integrations.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS integrations.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  category integrations.message_template_category_enum NOT NULL DEFAULT 'system',
  channel core.notification_channel_enum NOT NULL DEFAULT 'in_app',
  subject_template text NOT NULL DEFAULT '',
  body_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_templates_code_channel UNIQUE (code, channel)
);

DROP TRIGGER IF EXISTS trg_message_templates_updated_at ON integrations.message_templates;
CREATE TRIGGER trg_message_templates_updated_at
BEFORE UPDATE ON integrations.message_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_message_templates_category ON integrations.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_code ON integrations.message_templates(code);

-- Migrate appointment templates from legacy table
INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
SELECT
  code,
  name,
  'appointment'::integrations.message_template_category_enum,
  channel,
  subject_template,
  body_template,
  '["typeName","scheduledAt","appointmentCode","patientName"]'::jsonb
FROM operations.appointment_notification_templates
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  updated_at = now();

-- Seed liver-care and system templates
INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  ('otp_sent', 'Patient portal OTP', 'otp', 'sms', '', 'Your Livotale verification code is sent to your phone. Valid for 10 minutes.', '["patientName"]'),
  ('technician_intake_otp', 'Technician intake OTP', 'otp', 'sms', '', 'Your Livotale intake verification code has been sent.', '["orderNumber","patientName"]'),
  ('visit_completion_otp', 'Visit completion OTP', 'otp', 'sms', '', 'Your Livotale visit completion code has been sent.', '["orderNumber","patientName"]'),

  ('enquiry_received', 'New enquiry', 'enquiry', 'in_app', 'New website enquiry', 'New enquiry from {{patientName}} ({{patientPhone}}).', '["patientName","patientPhone"]'),
  ('enquiry_received', 'New enquiry email', 'enquiry', 'email', 'New enquiry — {{patientName}}', 'A new enquiry was received from {{patientName}} ({{patientPhone}}).', '["patientName","patientPhone"]'),
  ('enquiry_assigned', 'Enquiry assigned', 'enquiry', 'in_app', 'Enquiry assigned to you', 'You have been assigned enquiry from {{patientName}}.', '["patientName","orderCode"]'),
  ('enquiry_converted', 'Enquiry converted', 'enquiry', 'in_app', 'Enquiry converted to order', 'Enquiry for {{patientName}} has been converted to order {{orderNumber}}.', '["patientName","orderNumber"]'),
  ('order_created', 'Order created', 'order', 'in_app', 'Order {{orderNumber}} created', 'Your Livotale order {{orderNumber}} for {{packageName}} has been created.', '["orderNumber","packageName","patientName"]'),
  ('payment_link_sent', 'Payment link', 'order', 'sms', '', 'Pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}', '["orderNumber","amount","paymentLink","patientName"]'),
  ('payment_link_sent', 'Payment link email', 'order', 'email', 'Payment link — {{orderNumber}}', 'Please complete payment of ₹{{amount}} for order {{orderNumber}}: {{paymentLink}}', '["orderNumber","amount","paymentLink","patientName"]'),
  ('payment_link_sent', 'Payment link in-app', 'order', 'in_app', 'Payment link sent', 'Payment link for ₹{{amount}} sent for order {{orderNumber}}.', '["orderNumber","amount","patientName"]'),
  ('payment_completed', 'Payment completed', 'order', 'in_app', 'Payment received', 'Payment of ₹{{amount}} received for order {{orderNumber}}.', '["orderNumber","amount","patientName"]'),
  ('payment_completed', 'Payment completed SMS', 'order', 'sms', '', 'Payment of ₹{{amount}} received for Livotale order {{orderNumber}}. Thank you!', '["orderNumber","amount","patientName"]'),
  ('payment_failed', 'Payment failed', 'order', 'in_app', 'Payment failed', 'Payment attempt failed for order {{orderNumber}}. Please retry.', '["orderNumber","patientName"]'),

  ('technician_assigned', 'Technician assigned', 'scan', 'in_app', 'Technician assigned', '{{technicianName}} assigned for your fibrosis scan (order {{orderNumber}}).', '["technicianName","orderNumber","patientName"]'),
  ('technician_assigned', 'Technician assigned SMS', 'scan', 'sms', '', 'Technician {{technicianName}} assigned for your Livotale scan. Order {{orderNumber}}.', '["technicianName","orderNumber","patientName"]'),
  ('scan_scheduled', 'Scan scheduled', 'scan', 'in_app', 'Scan scheduled', 'Your fibrosis scan is scheduled for {{scanScheduledAt}}.', '["scanScheduledAt","orderNumber","patientName"]'),
  ('scan_scheduled', 'Scan scheduled SMS', 'scan', 'sms', '', 'Livotale scan scheduled for {{scanScheduledAt}}. Order {{orderNumber}}.', '["scanScheduledAt","orderNumber","patientName"]'),
  ('scan_started', 'Scan started', 'scan', 'in_app', 'Scan in progress', 'Technician has started the fibrosis scan for order {{orderNumber}}.', '["orderNumber"]'),
  ('scan_completed', 'Scan completed', 'scan', 'in_app', 'Scan completed', 'Fibrosis scan completed for order {{orderNumber}}.', '["orderNumber","patientName"]'),
  ('scan_reviewed', 'Scan reviewed', 'scan', 'in_app', 'Scan reviewed', 'Scan data reviewed for order {{orderNumber}}.', '["orderNumber"]'),

  ('lab_assigned', 'Lab assigned', 'lab', 'in_app', 'Partner lab assigned', 'Partner lab assigned for order {{orderNumber}}.', '["orderNumber","partnerLabName"]'),
  ('sample_dispatch_pending', 'Sample ready', 'lab', 'in_app', 'Sample ready for dispatch', 'Blood sample ready to send to lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('sample_dispatched', 'Sample dispatched', 'lab', 'in_app', 'Sample dispatched', 'Sample dispatched to partner lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('sample_received_at_lab', 'Sample at lab', 'lab', 'in_app', 'Sample received at lab', 'Partner lab confirmed sample receipt for order {{orderNumber}}.', '["orderNumber"]'),
  ('awaiting_lab_report', 'Awaiting lab report', 'lab', 'in_app', 'Awaiting lab report', 'Waiting for pathology report for order {{orderNumber}}.', '["orderNumber"]'),
  ('awaiting_lab_report', 'Awaiting lab report email', 'lab', 'email', 'Awaiting lab report — {{orderNumber}}', 'Pathology report pending from partner lab for order {{orderNumber}}.', '["orderNumber"]'),
  ('lab_report_uploaded', 'Lab report uploaded', 'lab', 'in_app', 'Lab report uploaded', 'Pathology report uploaded for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_extraction_ready', 'AI extraction ready', 'lab', 'in_app', 'AI extraction ready', 'AI extraction complete — review pending for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_reupload_required', 'AI reupload required', 'lab', 'in_app', 'Reupload required', 'New pathology PDF required for order {{orderNumber}}.', '["orderNumber"]'),
  ('ai_verified', 'AI verified', 'lab', 'in_app', 'AI fields verified', 'Extracted pathology fields verified for order {{orderNumber}}.', '["orderNumber"]'),

  ('final_report_generated', 'Report generated', 'report', 'in_app', 'Final report generated', 'Final report generated for order {{orderNumber}}.', '["orderNumber","reportNumber"]'),
  ('final_report_published', 'Report published', 'report', 'in_app', 'Your report is ready', 'Your Livotale report for order {{orderNumber}} is available.', '["orderNumber","reportUrl","patientName"]'),
  ('final_report_published', 'Report published SMS', 'report', 'sms', '', 'Your Livotale report for order {{orderNumber}} is ready: {{reportUrl}}', '["orderNumber","reportUrl","patientName"]'),
  ('doctor_assigned', 'Doctor assigned', 'report', 'in_app', 'Doctor assigned', 'Dr. {{doctorName}} assigned for order {{orderNumber}}.', '["doctorName","orderNumber","patientName"]'),
  ('consultation_scheduled', 'Consultation scheduled', 'report', 'in_app', 'Consultation scheduled', 'Video consultation scheduled for {{consultationScheduledAt}}.', '["consultationScheduledAt","orderNumber","doctorName"]'),
  ('consultation_completed', 'Consultation completed', 'report', 'in_app', 'Consultation completed', 'Consultation completed for order {{orderNumber}}.', '["orderNumber"]'),
  ('prescription_published', 'Prescription published', 'report', 'in_app', 'Prescription ready', 'Your prescription for order {{orderNumber}} is available.', '["orderNumber","patientName"]'),
  ('prescription_published', 'Prescription SMS', 'report', 'sms', '', 'Your Livotale prescription for order {{orderNumber}} is ready.', '["orderNumber","patientName"]'),

  ('audit_alert', 'Audit alert', 'system', 'in_app', 'Security alert', '{{alertMessage}}', '["alertMessage"]'),
  ('audit_alert', 'Audit alert email', 'system', 'email', 'Livotale security alert', '{{alertMessage}}', '["alertMessage"]')
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
VALUES (
  'default',
  'Default clinic letterhead',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #2563eb; }
    .meta { font-size: 12px; color: #666; margin-top: 4px; }
    h1 { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
  </style></head><body>
    <div class="header">
      <div class="company">{{ companyName }}</div>
      <div class="meta">{{ email }}</div>
    </div>
    <h1>{{ reportTypeLabel }}</h1>
    <p><strong>Patient:</strong> {{ patientName }} · <strong>Order:</strong> {{ orderNumber }}</p>
    <p><strong>Report #:</strong> {{ reportNumber }} · <strong>Date:</strong> {{ generatedAt }}</p>
    {% if fibrosisSection %}<h2>{{ fibrosisSection.title }}</h2><table><tr><th>Parameter</th><th>Value</th></tr>
    {% for row in fibrosisSection.rows %}<tr><td>{{ row.label }}</td><td>{{ row.value }}</td></tr>{% endfor %}
    </table>{% endif %}
    {% if pathologySection %}<h2>{{ pathologySection.title }}</h2><table><tr><th>Test</th><th>Value</th><th>Flag</th></tr>
    {% for row in pathologySection.rows %}<tr><td>{{ row.label }}</td><td>{{ row.value }}</td><td>{{ row.flag }}</td></tr>{% endfor %}
    </table>{% endif %}
    <p>{{ interpretation }}</p>
    <div class="footer">{{ disclaimer }} · {{ footer }}</div>
  </body></html>',
  true
)
ON CONFLICT (code) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  updated_at = now();

COMMIT;

-- -----------------------------------------------------------------------------
-- 042_integrations_twilio_from_pdf_templates.sql
-- -----------------------------------------------------------------------------
-- 042: Twilio direct From number + align PDF letterhead template codes

BEGIN;

ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS twilio_from_number varchar(20);

-- Align runtime template codes used by report/prescription PDF generation
INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
SELECT
  'default-letterhead',
  'Default report letterhead',
  html_body,
  active
FROM clinical.letterhead_templates
WHERE code = 'default'
ON CONFLICT (code) DO UPDATE SET
  html_body = COALESCE(EXCLUDED.html_body, clinical.letterhead_templates.html_body),
  updated_at = now();

INSERT INTO clinical.letterhead_templates (code, name, html_body, active)
VALUES (
  'default-rx',
  'Default prescription letterhead',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #2563eb; }
    h1 { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
  </style></head><body>
    <div class="header"><div class="company">Livotale Liver Care</div></div>
    <h1>Prescription</h1>
    <p><strong>Patient:</strong> {{ patientName }} · <strong>Doctor:</strong> {{ doctorName }}</p>
    <p><strong>Order:</strong> {{ orderId }} · <strong>Prescription:</strong> {{ prescriptionId }}</p>
    {% if diagnosis %}<p><strong>Diagnosis:</strong> {{ diagnosis }}</p>{% endif %}
    <h2>Medicines</h2>
    <table><tr><th>Name</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr>
    {% for med in medicines %}<tr>
      <td>{{ med.name or med.medicineName or '' }}</td>
      <td>{{ med.dose or '' }}</td>
      <td>{{ med.frequency or '' }}</td>
      <td>{{ med.duration or '' }}</td>
    </tr>{% endfor %}
    </table>
  </body></html>',
  true
)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 043_sms_test_templates.sql
-- -----------------------------------------------------------------------------
-- 043: Focused SMS test templates with {{variable}} placeholders

BEGIN;

UPDATE integrations.message_templates
SET
  name = 'Patient OTP SMS',
  body_template = 'Hi {{patientName}}, your Livotale verification code is {{otpCode}}. Valid for 10 minutes. Do not share this code.',
  variables = '["patientName","otpCode"]'::jsonb,
  updated_at = now()
WHERE code = 'otp_sent' AND channel = 'sms';

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES (
  'otp_sent',
  'Patient OTP SMS',
  'otp',
  'sms',
  '',
  'Hi {{patientName}}, your Livotale verification code is {{otpCode}}. Valid for 10 minutes. Do not share this code.',
  '["patientName","otpCode"]'::jsonb
)
ON CONFLICT (code, channel) DO NOTHING;

UPDATE integrations.message_templates
SET
  name = 'Payment link SMS',
  body_template = 'Hi {{patientName}}, pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}',
  variables = '["patientName","orderNumber","amount","paymentLink"]'::jsonb,
  updated_at = now()
WHERE code = 'payment_link_sent' AND channel = 'sms';

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES (
  'payment_link_sent',
  'Payment link SMS',
  'order',
  'sms',
  '',
  'Hi {{patientName}}, pay ₹{{amount}} for Livotale order {{orderNumber}}: {{paymentLink}}',
  '["patientName","orderNumber","amount","paymentLink"]'::jsonb
)
ON CONFLICT (code, channel) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 044_org_operating_hours.sql
-- -----------------------------------------------------------------------------
-- Org operating hours for 45-minute home visit slot generation
CREATE TABLE IF NOT EXISTS operations.org_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_city TEXT NOT NULL DEFAULT 'default',
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '08:00',
  close_time TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 45,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_city, day_of_week)
);

-- Seed default: Sun closed; Mon–Sat 08:00–18:00, 45-min slots
INSERT INTO operations.org_operating_hours (org_city, day_of_week, open_time, close_time, slot_duration_minutes, is_closed)
VALUES
  ('default', 0, '08:00', '18:00', 45, true),
  ('default', 1, '08:00', '18:00', 45, false),
  ('default', 2, '08:00', '18:00', 45, false),
  ('default', 3, '08:00', '18:00', 45, false),
  ('default', 4, '08:00', '18:00', 45, false),
  ('default', 5, '08:00', '18:00', 45, false),
  ('default', 6, '08:00', '18:00', 45, false)
ON CONFLICT (org_city, day_of_week) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 044_twilio_parent_account_sid.sql
-- -----------------------------------------------------------------------------
ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS twilio_parent_account_sid TEXT;

-- -----------------------------------------------------------------------------
-- 045_scan_notification_templates.sql
-- -----------------------------------------------------------------------------
-- Scan step notification templates (patient pref, schedule confirm, visit complete)

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  ('scan_date_requested', 'Patient scan slot requested', 'scan', 'in_app', 'Patient requested scan slot', '{{patientName}} requested a FibroScan home visit · {{timeSlot}} for order {{orderNumber}}.', '["patientName","orderNumber","timeSlot"]'),
  ('scan_schedule_confirmed', 'Home visit confirmed', 'scan', 'in_app', 'Home visit confirmed', 'Your fibrosis scan is confirmed for {{scanScheduledAt}} · {{timeSlot}}. Technician {{technicianName}}.', '["scanScheduledAt","timeSlot","technicianName","orderNumber","patientName"]'),
  ('scan_schedule_confirmed', 'Home visit confirmed SMS', 'scan', 'sms', '', 'Livotale home visit confirmed for {{scanScheduledAt}} · {{timeSlot}}. Technician {{technicianName}}. Order {{orderNumber}}.', '["scanScheduledAt","timeSlot","technicianName","orderNumber","patientName"]'),
  ('technician_visit_assigned', 'Technician visit assigned', 'scan', 'in_app', 'New home visit assigned', 'Home FibroScan visit assigned for order {{orderNumber}} · {{scanScheduledAt}} · {{timeSlot}}.', '["orderNumber","scanScheduledAt","timeSlot","patientName","technicianName"]'),
  ('visit_started', 'Technician en route', 'scan', 'in_app', 'Technician en route', 'Technician is en route for order {{orderNumber}} ({{patientName}}).', '["orderNumber","patientName","technicianName"]'),
  ('visit_reached', 'Technician at location', 'scan', 'in_app', 'Technician at patient location', 'Technician reached the patient location for order {{orderNumber}}.', '["orderNumber","patientName","technicianName"]'),
  ('scan_completed', 'Scan completed SMS', 'scan', 'sms', '', 'Your Livotale fibrosis scan for order {{orderNumber}} is complete. Your report will be available soon.', '["orderNumber","patientName"]')
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 046_inbox_user_recipients.sql
-- -----------------------------------------------------------------------------
-- 046: User-scoped inbox recipients and care task notification templates.

BEGIN;

ALTER TABLE audit.inbox_notifications
  DROP CONSTRAINT IF EXISTS inbox_notifications_recipient_type_chk;

ALTER TABLE audit.inbox_notifications
  ADD CONSTRAINT inbox_notifications_recipient_type_chk
  CHECK (recipient_type IN ('role', 'phone', 'user'));

ALTER TABLE audit.inbox_notifications
  ADD COLUMN IF NOT EXISTS trigger_action text;

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables)
VALUES
  (
    'care_task_assigned',
    'Care task assigned',
    'system',
    'in_app',
    'Care task assigned',
    'Follow-up task for {{patientName}} due {{dueDate}}.',
    '["patientName","dueDate","taskType"]'
  ),
  (
    'care_task_escalation',
    'Care task escalation',
    'system',
    'in_app',
    'Doctor escalation required',
    'Escalation task for {{patientName}}: {{notes}}.',
    '["patientName","notes","taskType"]'
  )
ON CONFLICT (code, channel) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 047_pathology_visit_and_external_id.sql
-- -----------------------------------------------------------------------------
-- Pathology external appointment ID + visit confirmation on service orders

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS pathology_external_appointment_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pathology_visit_outcome VARCHAR(16),
  ADD COLUMN IF NOT EXISTS pathology_visit_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pathology_visit_confirmed_by UUID REFERENCES identity.users(id);

ALTER TABLE integrations.lab_report_uploads
  ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_orders_pathology_external_appt
  ON commerce.service_orders (pathology_external_appointment_id)
  WHERE pathology_external_appointment_id IS NOT NULL;

COMMENT ON COLUMN commerce.service_orders.pathology_external_appointment_id IS
  'Appointment/order ID from 3rd-party lab partner site (ops-entered)';
COMMENT ON COLUMN commerce.service_orders.pathology_visit_outcome IS
  'Lab collector visit outcome: visited | no_show';

-- -----------------------------------------------------------------------------
-- 048_consult_patient_preference.sql
-- -----------------------------------------------------------------------------
-- Patient consult preference fields (mirrors scan_patient_preferred_at pattern)

ALTER TABLE commerce.service_orders
  ADD COLUMN IF NOT EXISTS consultation_patient_preferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_time_slot text;

INSERT INTO integrations.message_templates (code, name, category, channel, subject_template, body_template, variables) VALUES
  (
    'consultation_date_requested',
    'Patient consult slot requested',
    'appointment',
    'in_app',
    'Patient requested consult slot',
    '{{patientName}} requested a teleconsult · {{timeSlot}} for order {{orderNumber}}.',
    '["patientName","orderNumber","timeSlot"]'
  ),
  (
    'consultation_schedule_confirmed',
    'Consult schedule confirmed',
    'appointment',
    'in_app',
    'Consultation confirmed',
    'Your teleconsult for order {{orderNumber}} is confirmed · {{timeSlot}} with {{doctorName}}.',
    '["patientName","orderNumber","timeSlot","doctorName","consultationScheduledAt"]'
  )
ON CONFLICT (code, channel) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  variables = EXCLUDED.variables,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 049_platform_payment_settings.sql
-- -----------------------------------------------------------------------------
-- 049: Platform-wide payment collection settings (UPI ID + QR image)

BEGIN;

ALTER TABLE integrations.platform_settings
  ADD COLUMN IF NOT EXISTS payment_upi_id varchar(256),
  ADD COLUMN IF NOT EXISTS payment_qr_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_payee_name varchar(160);

COMMIT;

-- -----------------------------------------------------------------------------
-- 050_platform_s3_settings.sql
-- -----------------------------------------------------------------------------
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
