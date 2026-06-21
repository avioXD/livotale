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
