import type { AuditLogEntry } from '@/types/adminDashboard';

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'aud-1', action: 'order_created', entityType: 'service_order', entityId: 'lco-4', newValue: 'LFS-2026-0004', performedBy: 'operations', performedAt: days(0), ipAddress: '10.0.0.12' },
  { id: 'aud-2', action: 'payment_link_sent', entityType: 'service_order', entityId: 'lco-4', newValue: 'whatsapp,sms,email', performedBy: 'operations', performedAt: days(0), ipAddress: '10.0.0.12' },
  { id: 'aud-3', action: 'final_report_published', entityType: 'final_report', entityId: 'fr-lco-3', newValue: 'RPT-2026-0003', performedBy: 'operations', performedAt: days(2), ipAddress: '10.0.0.8' },
  { id: 'aud-4', action: 'doctor_assigned', entityType: 'service_order', entityId: 'lco-3', oldValue: 'unassigned', newValue: 'doc-1', performedBy: 'operations', performedAt: days(2), ipAddress: '10.0.0.8' },
  { id: 'aud-5', action: 'ai_extraction_verified', entityType: 'ai_extraction_job', entityId: 'ai-job-lco-3', newValue: '22 fields', performedBy: 'operations', performedAt: days(3), ipAddress: '10.0.0.8' },
  { id: 'aud-6', action: 'lab_report_uploaded', entityType: 'lab_report', entityId: 'lr-lco-3', newValue: 'liver-panel-priya.pdf', performedBy: 'operations', performedAt: days(4), ipAddress: '10.0.0.5' },
  { id: 'aud-7', action: 'scan_completed', entityType: 'fibrosis_scan', entityId: 'scan-lco-3', newValue: 'LSM 7.1 kPa', performedBy: 'technician', performedAt: days(5), ipAddress: '10.0.0.3' },
  { id: 'aud-8', action: 'enquiry_converted', entityType: 'enquiry', entityId: 'enq-3', oldValue: 'interested', newValue: 'lco-3', performedBy: 'operations', performedAt: days(9), ipAddress: '10.0.0.2' },
  { id: 'aud-9', action: 'offline_payment_recorded', entityType: 'service_order', entityId: 'lco-1', newValue: '₹5,500 cash', performedBy: 'operations', performedAt: days(4), ipAddress: '10.0.0.11' },
  { id: 'aud-10', action: 'technician_assigned', entityType: 'service_order', entityId: 'lco-1', oldValue: 'unassigned', newValue: 'tech-1', performedBy: 'operations', performedAt: days(3), ipAddress: '10.0.0.11' },
  { id: 'aud-11', action: 'lab_report_uploaded', entityType: 'lab_report', entityId: 'lr-lco-2', newValue: 'liver-panel-rohan.pdf', performedBy: 'operations', performedAt: days(3), ipAddress: '10.0.0.6' },
  { id: 'aud-12', action: 'ai_extraction_verified', entityType: 'ai_extraction_job', entityId: 'ai-job-lco-2', newValue: '18 fields', performedBy: 'operations', performedAt: days(2), ipAddress: '10.0.0.6' },
  { id: 'aud-13', action: 'payment_completed', entityType: 'service_order', entityId: 'lco-5', newValue: '₹5,500 UPI', performedBy: 'operations', performedAt: days(1), ipAddress: '10.0.0.14' },
  { id: 'aud-14', action: 'technician_assigned', entityType: 'service_order', entityId: 'lco-5', newValue: 'tech-1', performedBy: 'operations', performedAt: days(0), ipAddress: '10.0.0.14' },
];
