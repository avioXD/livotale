import type { LiverCareOrder } from '@/types/serviceOrder';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { formatTimeSlotDisplay } from './appointmentSlots';

export const TELECONSULT_VISIT_LABEL = 'Video teleconsult';

const CONSULT_ELIGIBLE_STATUSES = new Set([
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
]);

export function isConsultReportReady(order: LiverCareOrder): boolean {
  return CONSULT_ELIGIBLE_STATUSES.has(order.orderStatus) || Boolean(order.consultationScheduledAt);
}

export function canPatientSubmitConsultPreference(order: LiverCareOrder): boolean {
  return (
    isConsultReportReady(order) &&
    !order.consultationScheduledAt &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'completed'
  );
}

export function canOpsConfirmConsultSchedule(order: LiverCareOrder, readOnly = false): boolean {
  return (
    !readOnly &&
    isConsultReportReady(order) &&
    !order.consultationScheduledAt &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'completed'
  );
}

export function defaultEditableConsultDate(order: LiverCareOrder): string {
  const pref = order.consultationPatientPreferredAt;
  const scheduled = order.consultationScheduledAt;
  const candidate = pref ?? scheduled;
  if (!candidate) return tomorrowIso();
  const d = candidate.slice(0, 10);
  return d >= tomorrowIso() ? d : tomorrowIso();
}

export function formatConsultVisitSummary(order: LiverCareOrder): string {
  const at = order.consultationScheduledAt ?? order.consultationPatientPreferredAt;
  if (!at) return '—';
  const when = new Date(at).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const slot = order.consultationTimeSlot
    ? ` · ${formatTimeSlotDisplay(order.consultationTimeSlot)}`
    : '';
  return `${when}${slot}`;
}
