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
