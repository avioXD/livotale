import type { LiverCareOrder } from '@/types/serviceOrder';
import {
  buildAppointmentScheduledAt,
  composeAppointmentDateTime,
  defaultEditableAppointmentDate,
  formatTimeSlotDisplay,
  getAppointmentTimeSlots,
  normalizeAppointmentSlotCode,
} from './appointmentSlots';

export interface PathologySchedulePrerequisite {
  id: string;
  label: string;
  met: boolean;
  owner: 'patient' | 'operations';
}

export function getPathologyTimeSlots(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  const isSaturday = day === 6;
  const blockedCodes = isSaturday ? ['16:30', '17:15'] : [];
  return getAppointmentTimeSlots(date, { blockedCodes });
}

export function defaultEditablePathologyDate(order: LiverCareOrder): string {
  return defaultEditableAppointmentDate(order.pathologyScheduledAt, order.pathologyPatientPreferredAt);
}

export function normalizePathologySlotCode(slotOrLabel?: string | null): string {
  return normalizeAppointmentSlotCode(slotOrLabel);
}

export function composePathologyDateTime(date: string, slotOrLabel: string): string | null {
  return composeAppointmentDateTime(date, slotOrLabel);
}

export function buildPathologyScheduledAt(date: string, slotOrLabel: string): string {
  return buildAppointmentScheduledAt(date, slotOrLabel);
}

export function isPaymentReadyForPathology(order: LiverCareOrder): boolean {
  return (
    order.paymentStatus === 'success' ||
    !['draft', 'created', 'payment_pending'].includes(order.orderStatus)
  );
}

export function getPathologySchedulePrerequisites(order: LiverCareOrder): PathologySchedulePrerequisite[] {
  return [
    {
      id: 'payment',
      label: 'Payment received',
      met: isPaymentReadyForPathology(order),
      owner: 'patient',
    },
    {
      id: 'lab',
      label: 'Lab partner assigned & portal order ID saved (from their website)',
      met: Boolean(
        order.partnerLabId &&
          order.pathologyLabOrderRef &&
          order.pathologyExternalAppointmentId,
      ),
      owner: 'operations',
    },
    {
      id: 'date',
      label: 'Pathology date and 45-min slot selected',
      met: Boolean(order.pathologyPatientPreferredAt || order.pathologyScheduledAt),
      owner: 'patient',
    },
  ];
}

export function canOpsConfirmPathologySchedule(order: LiverCareOrder): boolean {
  return getPathologySchedulePrerequisites(order).every((p) => p.met);
}

export function formatPathologyScheduleSummary(order: LiverCareOrder): string {
  const at = order.pathologyScheduledAt ?? order.pathologyPatientPreferredAt;
  if (!at) return 'Not scheduled';
  const slot = order.pathologyTimeSlot ? ` · ${formatTimeSlotDisplay(order.pathologyTimeSlot)}` : '';
  const lab = order.partnerLabName ? ` · ${order.partnerLabName}` : '';
  const pending = !order.pathologyScheduledAt && order.pathologyPatientPreferredAt ? ' (patient preference)' : '';
  const ref = order.pathologyLabOrderRef ? ` · Ref ${order.pathologyLabOrderRef}` : '';
  const ext = order.pathologyExternalAppointmentId
    ? ` · Appt ${order.pathologyExternalAppointmentId}`
    : '';
  return `Lab visit${slot} · ${new Date(at).toLocaleString()}${lab}${ref}${ext}${pending}`;
}
