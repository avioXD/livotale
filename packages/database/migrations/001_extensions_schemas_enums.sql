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
