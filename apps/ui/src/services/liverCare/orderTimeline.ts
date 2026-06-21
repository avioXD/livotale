import type { AuditLogEntry } from '@/types/adminDashboard';
import type { OrderTimelineCategory, OrderTimelineEvent } from '@/types/serviceOrder';
export interface AppendTimelineOptions {
  label?: string;
  detail?: string;
  performedBy?: string;
  category?: OrderTimelineCategory;
  metadata?: Record<string, string>;
}

const EVENT_CATALOG: Record<string, { label: string; category: OrderTimelineCategory }> = {
  order_created: { label: 'Order created', category: 'order' },
  enquiry_received: { label: 'Enquiry received', category: 'order' },
  submit: { label: 'Order submitted', category: 'order' },
  request_payment: { label: 'Payment requested', category: 'payment' },
  payment_link_sent: { label: 'Payment link sent', category: 'payment' },
  payment_submitted: { label: 'Payment proof submitted', category: 'payment' },
  payment_verified: { label: 'Payment verified', category: 'payment' },
  payment_rejected: { label: 'Payment proof rejected', category: 'payment' },
  payment_completed: { label: 'Payment received', category: 'payment' },
  payment_failed: { label: 'Payment failed', category: 'payment' },
  assign_technician: { label: 'Technician assigned', category: 'scan' },
  technician_reassigned: { label: 'Technician reassigned', category: 'scan' },
  scan_date_requested: { label: 'Patient selected scan date', category: 'scan' },
  consultation_date_requested: { label: 'Patient selected consult slot', category: 'consultation' },
  consultation_schedule_confirmed: { label: 'Consultation confirmed', category: 'consultation' },
  schedule_scan: { label: 'Scan scheduled', category: 'scan' },
  start_scan: { label: 'Scan started', category: 'scan' },
  visit_started: { label: 'Technician visit started', category: 'scan' },
  reached_location: { label: 'Technician reached patient location', category: 'scan' },
  visit_completion_otp_sent: { label: 'Completion OTP sent to patient', category: 'scan' },
  visit_completion_otp_verified: { label: 'Visit completion confirmed by patient OTP', category: 'scan' },
  scan_report_proof_uploaded: { label: 'FibroScan report proof uploaded', category: 'scan' },
  scan_data_fetched: { label: 'Scan data fetched from device', category: 'scan' },
  scan_saved: { label: 'Scan measurements saved', category: 'scan' },
  scan_reviewed: { label: 'Scan reviewed by operations', category: 'scan' },
  complete_scan: { label: 'Scan marked complete', category: 'scan' },
  scan_completed: { label: 'Fibrosis scan completed', category: 'scan' },
  scan_failed: { label: 'Scan could not be completed', category: 'scan' },
  patient_intake_entered: { label: 'Patient intake entered by operations', category: 'scan' },
  patient_intake_verified: { label: 'Patient intake submitted by technician', category: 'scan' },
  patient_intake_approved: { label: 'Patient intake validated by operations', category: 'scan' },
  patient_intake_rejected: { label: 'Patient intake rejected by operations', category: 'scan' },
  fibroscan_intake_submitted: { label: 'FibroScan intake submitted by technician', category: 'scan' },
  fibroscan_intake_approved: { label: 'FibroScan intake validated by operations', category: 'scan' },
  fibroscan_intake_rejected: { label: 'FibroScan intake rejected by operations', category: 'scan' },
  assign_lab: { label: 'Lab partner assigned', category: 'pathology' },
  lab_assigned: { label: 'Lab partner assigned', category: 'pathology' },
  lab_order_created: { label: 'Lab partner order created', category: 'pathology' },
  pathology_date_requested: { label: 'Patient selected pathology visit', category: 'pathology' },
  pathology_scheduled: { label: 'Pathology visit scheduled', category: 'pathology' },
  sample_collected: { label: 'Blood sample collected by lab partner', category: 'pathology' },
  sample_dispatched: { label: 'Blood sample submitted to lab', category: 'pathology' },
  sample_received_at_lab: { label: 'Sample received at lab', category: 'pathology' },
  awaiting_lab_report: { label: 'Awaiting lab report PDF', category: 'pathology' },
  upload_lab_report: { label: 'Lab report uploaded', category: 'pathology' },
  lab_report_uploaded: { label: 'Lab report uploaded', category: 'pathology' },
  trigger_ai: { label: 'AI extraction started', category: 'ai' },
  ai_extraction: { label: 'AI pathology extraction completed', category: 'ai' },
  verify_ai: { label: 'AI extraction verified', category: 'ai' },
  ai_verified: { label: 'Pathology data verified', category: 'ai' },
  ai_reupload_required: { label: 'Lab report re-upload required', category: 'ai' },
  generate_report: { label: 'Letterhead report generated', category: 'report' },
  final_report_generated: { label: 'Final report generated', category: 'report' },
  report_published: { label: 'Report published to patient', category: 'report' },
  assign_doctor: { label: 'Doctor assigned', category: 'consultation' },
  doctor_reassigned: { label: 'Doctor reassigned', category: 'consultation' },
  doctor_assigned: { label: 'Doctor assigned', category: 'consultation' },
  schedule_consultation: { label: 'Consultation scheduled', category: 'consultation' },
  consultation_scheduled: { label: 'Consultation scheduled', category: 'consultation' },
  complete_consultation: { label: 'Consultation completed', category: 'consultation' },
  consultation_completed: { label: 'Consultation completed', category: 'consultation' },
  publish_prescription: { label: 'Prescription published', category: 'prescription' },
  prescription_published: { label: 'Prescription published', category: 'prescription' },
  complete: { label: 'Order marked complete', category: 'order' },
  cancel: { label: 'Order cancelled', category: 'order' },
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  order_created: 'Order created',
  payment_link_sent: 'Payment link sent',
  payment_completed: 'Payment completed',
  final_report_published: 'Final report published',
  doctor_assigned: 'Doctor assigned',
  ai_extraction_verified: 'AI extraction verified',
  lab_report_uploaded: 'Lab report uploaded',
  scan_completed: 'Scan completed',
  enquiry_converted: 'Enquiry converted to order',
  technician_assigned: 'Technician assigned',
  offline_payment_recorded: 'Offline payment recorded',
};

const CATEGORY_STYLES: Record<OrderTimelineCategory, string> = {
  order: 'bg-slate-500',
  payment: 'bg-emerald-500',
  scan: 'bg-blue-500',
  pathology: 'bg-violet-500',
  ai: 'bg-amber-500',
  report: 'bg-rose-500',
  consultation: 'bg-cyan-500',
  prescription: 'bg-pink-500',
  system: 'bg-gray-400',
};

const PERFORMER_LABELS: Record<string, string> = {
  operations: 'Operations',
  admin: 'Administration',
  technician: 'Technician',
  doctor: 'Doctor',
  patient: 'Patient',
  system: 'System',
};

let timelineSeq = 1000;

export function appendOrderTimeline(
  orderId: string,
  eventType: string,
  options: AppendTimelineOptions = {},
): OrderTimelineEvent {
  const catalog = EVENT_CATALOG[eventType];
  const event: OrderTimelineEvent = {
    id: `tl-${Date.now()}-${timelineSeq++}`,
    orderId,
    eventType,
    label: options.label ?? catalog?.label ?? eventType.replace(/_/g, ' '),
    occurredAt: new Date().toISOString(),
    performedBy: options.performedBy ?? null,
    detail: options.detail ?? null,
    category: options.category ?? catalog?.category ?? 'system',
    metadata: options.metadata,
  };
  // Timeline persistence is handled by the API.
  return event;
}

import { formatTimeSlotDisplay } from './appointmentSlots';

export function formatTransitionDetail(event: string, meta?: Record<string, string>): string | undefined {
  if (event === 'assign_technician' && meta?.technicianName) {
    return `Assigned to ${meta.technicianName}`;
  }
  if (event === 'assign_doctor' && meta?.doctorName) {
    return `Assigned to ${meta.doctorName}`;
  }
  if (event === 'schedule_consultation' && meta?.scheduledAt) {
    return `Video consult · ${new Date(meta.scheduledAt).toLocaleString()}`;
  }
  if (event === 'schedule_scan' && meta?.scheduledAt) {
    return `Home visit${meta.timeSlot ? ` · ${formatTimeSlotDisplay(meta.timeSlot)}` : ''} · ${new Date(meta.scheduledAt).toLocaleString()}`;
  }
  if (event === 'assign_lab' && meta?.partnerLabName) {
    return `Lab: ${meta.partnerLabName}`;
  }
  if (event === 'payment_completed') return 'Order status advanced to payment completed';
  if (event === 'complete_scan') return 'Scan step finished — next workflow step unlocked';
  if (event === 'complete') return 'All package steps finished';
  return undefined;
}

export function getCategoryStyle(category?: OrderTimelineCategory): string {
  return CATEGORY_STYLES[category ?? 'system'];
}

export function formatPerformer(performedBy?: string | null): string | null {
  if (!performedBy) return null;
  return PERFORMER_LABELS[performedBy] ?? performedBy;
}

export function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

export function formatAuditDetail(entry: AuditLogEntry): string | null {
  const parts: string[] = [];
  if (entry.entityType) {
    parts.push(`Entity: ${entry.entityType.replace(/_/g, ' ')}`);
  }
  if (entry.oldValue && entry.newValue) {
    parts.push(`Changed from “${entry.oldValue}” to “${entry.newValue}”`);
  } else if (entry.newValue) {
    parts.push(`Value: ${entry.newValue}`);
  } else if (entry.oldValue) {
    parts.push(`Previous: ${entry.oldValue}`);
  }
  if (entry.ipAddress) {
    parts.push(`IP ${entry.ipAddress}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export interface ActivityLogItem {
  id: string;
  title: string;
  detail?: string | null;
  occurredAt: string;
  source: 'timeline' | 'audit';
  category?: OrderTimelineCategory | 'audit';
  performedBy?: string | null;
  metadata?: Record<string, string>;
  entityType?: string;
}

export function buildActivityLogItems(
  timeline: OrderTimelineEvent[],
  audit: AuditLogEntry[],
): ActivityLogItem[] {
  const items: ActivityLogItem[] = [
    ...timeline.map((t) => ({
      id: `tl-${t.id}`,
      title: t.label,
      detail: t.detail,
      occurredAt: t.occurredAt,
      source: 'timeline' as const,
      category: t.category ?? EVENT_CATALOG[t.eventType]?.category ?? 'system',
      performedBy: t.performedBy,
      metadata: t.metadata,
    })),
    ...audit.map((a) => ({
      id: `aud-${a.id}`,
      title: formatAuditAction(a.action),
      detail: formatAuditDetail(a),
      occurredAt: a.performedAt,
      source: 'audit' as const,
      category: 'audit' as const,
      performedBy: a.performedBy,
      entityType: a.entityType,
    })),
  ];
  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
