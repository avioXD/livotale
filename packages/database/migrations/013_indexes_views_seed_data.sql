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

-- Seed core cities and a default clinic.
INSERT INTO core.cities(name, state, country) VALUES
  ('Mumbai', 'Maharashtra', 'India'),
  ('Bengaluru', 'Karnataka', 'India'),
  ('Delhi NCR', 'Delhi', 'India'),
  ('Hyderabad', 'Telangana', 'India'),
  ('Pune', 'Maharashtra', 'India'),
  ('Chennai', 'Tamil Nadu', 'India')
ON CONFLICT (name, state, country) DO NOTHING;

INSERT INTO core.clinics(name, registration_number, city_id, address, contact_number, status)
SELECT 'LIVGASTRO Smart Liver Clinic', 'LIVGASTRO-HQ', c.id, 'Operations headquarters', '+910000000000', 'active'
FROM core.cities c
WHERE c.name = 'Mumbai' AND c.state = 'Maharashtra'
ON CONFLICT (registration_number) WHERE registration_number IS NOT NULL DO NOTHING;

-- Seed packages and rules.
INSERT INTO core.care_packages(code, name, duration_days, description, target_condition, base_price, status) VALUES
  ('PCK_3M', '3 Months', 90, 'Lifestyle correction package for mild fatty liver and low fibrosis risk.', 'Mild fatty liver', 0, 'active'),
  ('PCK_6M', '6 Months', 180, 'Structured metabolic and fibrosis management package.', 'Moderate fibrosis or diabetes with fatty liver', 0, 'active'),
  ('PCK_1Y', '1 Year', 365, 'Longitudinal high-risk package for advanced fibrosis or high metabolic risk.', 'Advanced fibrosis or high metabolic risk', 0, 'active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  description = EXCLUDED.description,
  target_condition = EXCLUDED.target_condition;

INSERT INTO core.package_rules(package_id, rule_name, min_fibroscan_kpa, max_fibroscan_kpa, min_bmi, has_diabetes, fibrosis_stage, priority)
SELECT id, 'Mild fatty liver / lifestyle correction', NULL, 7.0, NULL, NULL, 'F0'::clinical.fibrosis_stage_enum, 10 FROM core.care_packages WHERE code = 'PCK_3M'
UNION ALL
SELECT id, 'Moderate fibrosis or diabetes with fatty liver', 7.0, 9.5, 25, true, 'F2'::clinical.fibrosis_stage_enum, 20 FROM core.care_packages WHERE code = 'PCK_6M'
UNION ALL
SELECT id, 'Advanced fibrosis or high metabolic risk', 9.5, NULL, 27, NULL, 'F3'::clinical.fibrosis_stage_enum, 30 FROM core.care_packages WHERE code = 'PCK_1Y'
ON CONFLICT (package_id, rule_name) DO UPDATE SET
  min_fibroscan_kpa = EXCLUDED.min_fibroscan_kpa,
  max_fibroscan_kpa = EXCLUDED.max_fibroscan_kpa,
  min_bmi = EXCLUDED.min_bmi,
  has_diabetes = EXCLUDED.has_diabetes,
  fibrosis_stage = EXCLUDED.fibrosis_stage,
  priority = EXCLUDED.priority;

-- Seed common lab tests.
INSERT INTO clinical.lab_tests(code, name, unit, normal_min, normal_max, category, sort_order) VALUES
  ('SGPT', 'Alanine aminotransferase / SGPT', 'U/L', 0, 40, 'lft', 10),
  ('SGOT', 'Aspartate aminotransferase / SGOT', 'U/L', 0, 40, 'lft', 20),
  ('GGT', 'Gamma-glutamyl transferase', 'U/L', 0, 55, 'lft', 30),
  ('ALP', 'Alkaline phosphatase', 'U/L', 44, 147, 'lft', 40),
  ('BIL_TOTAL', 'Total bilirubin', 'mg/dL', 0.1, 1.2, 'lft', 50),
  ('HBA1C', 'HbA1c', '%', 4.0, 5.6, 'diabetes', 60),
  ('CHOL_TOTAL', 'Total cholesterol', 'mg/dL', NULL, 200, 'lipid', 70),
  ('TG', 'Triglycerides', 'mg/dL', NULL, 150, 'lipid', 80),
  ('PLATELETS', 'Platelets', '10^3/uL', 150, 450, 'cbc', 90),
  ('CREATININE', 'Creatinine', 'mg/dL', 0.6, 1.3, 'renal', 100),
  ('HBsAG', 'Hepatitis B surface antigen', NULL, NULL, NULL, 'viral', 110),
  ('ANTI_HCV', 'Hepatitis C antibody', NULL, NULL, NULL, 'viral', 120)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  normal_min = EXCLUDED.normal_min,
  normal_max = EXCLUDED.normal_max,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Seed pharmacy categories and starter products used in the prototype.
INSERT INTO commerce.product_categories(code, name, sort_order) VALUES
  ('MEDICINES', 'Medicines', 10),
  ('SUPPLEMENTS', 'Supplements', 20),
  ('PROBIOTICS', 'Probiotics', 30),
  ('EXERCISE_TOOLS', 'Exercise Tools', 40),
  ('WELLNESS', 'Wellness', 50)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO commerce.products(category_id, sku, name, product_type, requires_prescription, description, strength, pack_size, price, gst_percent)
SELECT pc.id, 'UDILIV-300-30', 'Udiliv 300mg', 'medicine'::commerce.product_type_enum, true, 'Ursodeoxycholic acid', '300mg', '30 tablets', 720, 12 FROM commerce.product_categories pc WHERE pc.code = 'MEDICINES'
UNION ALL
SELECT pc.id, 'SILYMARIN-140-30', 'Silymarin 140mg', 'supplement'::commerce.product_type_enum, false, 'Milk thistle extract', '140mg', '30 capsules', 540, 12 FROM commerce.product_categories pc WHERE pc.code = 'SUPPLEMENTS'
UNION ALL
SELECT pc.id, 'LIV52-DS-60', 'Liv-52 DS', 'supplement'::commerce.product_type_enum, false, 'Hepatoprotective supplement', NULL, '60 tablets', 240, 12 FROM commerce.product_categories pc WHERE pc.code = 'SUPPLEMENTS'
UNION ALL
SELECT pc.id, 'VITE-400-30', 'Vitamin E 400 IU', 'supplement'::commerce.product_type_enum, false, 'Antioxidant supplement', '400 IU', '30 capsules', 320, 12 FROM commerce.product_categories pc WHERE pc.code = 'SUPPLEMENTS'
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  product_type = EXCLUDED.product_type,
  requires_prescription = EXCLUDED.requires_prescription,
  description = EXCLUDED.description,
  strength = EXCLUDED.strength,
  pack_size = EXCLUDED.pack_size,
  price = EXCLUDED.price,
  gst_percent = EXCLUDED.gst_percent;

-- Seed DPDP-aligned purposes and retention defaults.
INSERT INTO audit.data_processing_purposes(code, name, description, lawful_basis, default_retention_days, is_sensitive) VALUES
  ('CARE_DELIVERY', 'Care delivery', 'Process health data for diagnosis, prescription, follow-up, and care coordination.', 'consent', 3650, true),
  ('AI_ASSISTANCE', 'AI assistance', 'Use clinical inputs to generate risk scores, recommendations, and draft plans for doctor review.', 'consent', 1825, true),
  ('PHARMACY_FULFILLMENT', 'Pharmacy fulfillment', 'Process prescriptions, orders, payment, and delivery information.', 'consent', 2555, true),
  ('LEGAL_AUDIT', 'Legal and audit', 'Maintain medico-legal audit trails, access logs, consent, and security records.', 'legal_obligation', 3650, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  lawful_basis = EXCLUDED.lawful_basis,
  default_retention_days = EXCLUDED.default_retention_days,
  is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO audit.privacy_notices(code, version, title, notice_text, effective_from, status) VALUES
  ('LIVGASTRO_DPDP_NOTICE', '1.0', 'LIVGASTRO Privacy Notice', 'Processing notice for home-based AI assisted liver care, clinical review, pharmacy fulfillment, and support workflows.', CURRENT_DATE, 'active')
ON CONFLICT (code, version) DO NOTHING;

INSERT INTO audit.retention_policies(entity_type, purpose_id, retention_days, retention_action)
SELECT 'clinical_records', id, 3650, 'archive'::audit.retention_action_enum FROM audit.data_processing_purposes WHERE code = 'CARE_DELIVERY'
ON CONFLICT (entity_type) DO NOTHING;

INSERT INTO audit.retention_policies(entity_type, purpose_id, retention_days, retention_action)
SELECT 'ai_assessments', id, 1825, 'archive'::audit.retention_action_enum FROM audit.data_processing_purposes WHERE code = 'AI_ASSISTANCE'
ON CONFLICT (entity_type) DO NOTHING;

INSERT INTO audit.retention_policies(entity_type, purpose_id, retention_days, retention_action)
SELECT 'audit_logs', id, 3650, 'retain'::audit.retention_action_enum FROM audit.data_processing_purposes WHERE code = 'LEGAL_AUDIT'
ON CONFLICT (entity_type) DO NOTHING;

COMMIT;
