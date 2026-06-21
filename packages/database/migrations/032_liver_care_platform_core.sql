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

-- Seed default packages
INSERT INTO commerce.liver_care_packages (code, name, description, price, includes, fibrosis_scan_included, pathology_included, consultation_included, visibility_web, sort_order, terms_conditions, recommended_tag)
VALUES
  ('PKG-1', 'Liver Fibrosis Scan', 'Non-invasive liver stiffness measurement with basic scan report.', 5500,
   '{"bullets":["Liver fibrosis scan at home","Basic scan report","Digital report delivery"]}'::jsonb,
   true, false, false, true, 1, 'Fasting 3 hours recommended.', false),
  ('PKG-2', 'Liver Fibrosis Scan + Pathological Test', 'Fibrosis scan with blood pathology panel.', 8000,
   '{"bullets":["Liver fibrosis scan","Pathological blood test","Final combined report"]}'::jsonb,
   true, true, false, true, 2, 'Includes home sample collection.', true),
  ('PKG-3', 'Liver Fibrosis Scan + Pathological Test + Doctor Consultation Video', 'Full liver care package with consultation and prescription.', 9500,
   '{"bullets":["Liver fibrosis scan","Pathological test","Final combined report","Doctor video consultation","Digital prescription"]}'::jsonb,
   true, true, true, true, 3, 'Consultation after reports are ready.', false);

COMMIT;
