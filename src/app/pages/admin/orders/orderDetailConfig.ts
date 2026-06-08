import type { OrderStatus } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

/** @deprecated Use OrderBusinessStepId + orderBusinessSteps.ts — kept for list filters only. */
export type OrderDetailTab = never;

export const ORDER_CREATED_BY_PRESETS = [
  { value: '', label: 'All creators' },
  { value: 'operations', label: 'Operations' },
  { value: 'admin', label: 'Admin' },
];

export const ORDER_ASSIGNED_TO_PRESETS = [
  { value: '', label: 'All assignees' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'tech-1', label: 'Demo Technician' },
  { value: 'doc-1', label: 'Dr. Meera Iyer' },
  { value: 'lab-1', label: 'Metro Diagnostics' },
  { value: 'lab-2', label: 'LifeCare Pathology' },
];

const ORDER_STATUS_FILTER_KEYS: OrderStatus[] = [
  'created',
  'payment_pending',
  'payment_completed',
  'technician_assigned',
  'scan_completed',
  'pathology_pending',
  'lab_report_uploaded',
  'final_report_generated',
  'consultation_pending',
  'completed',
  'cancelled',
];

export const ORDER_STATUS_PRESETS = [
  { value: '', label: 'All workflow stages' },
  ...ORDER_STATUS_FILTER_KEYS.map((s) => ({
    value: s,
    label: ORDER_STATUS_LABELS[s],
  })),
];

export const ORDER_PAYMENT_PRESETS = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'link_sent', label: 'Link sent' },
  { value: 'success', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
];

export function createdByLabel(createdBy?: string | null): string {
  if (!createdBy) return '—';
  if (createdBy === 'operations') return 'Operations';
  if (createdBy === 'admin') return 'Admin';
  return createdBy;
}

export function assignedToLabel(order: {
  technicianName?: string | null;
  doctorName?: string | null;
  partnerLabName?: string | null;
}): string {
  return order.technicianName ?? order.doctorName ?? order.partnerLabName ?? '—';
}
