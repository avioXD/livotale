import type { TimeSlotOption } from '@/types';
import type { LiverCareOrder } from '@/types/serviceOrder';

/** FibroScan is home-visit only — no clinic walk-in or on-site booking. */
export const FIBROSCAN_VISIT_MODE = 'home' as const;

export const FIBROSCAN_VISIT_LABEL = 'Home visit';

export interface ScanSchedulePrerequisite {
  id: string;
  label: string;
  met: boolean;
  owner: 'patient' | 'operations';
}

import {
  APPOINTMENT_SLOT_DURATION_MINUTES,
  buildAppointmentScheduledAt,
  composeAppointmentDateTime,
  defaultEditableAppointmentDate,
  getAppointmentTimeSlots,
  formatTimeSlotDisplay,
  normalizeAppointmentSlotCode,
} from './appointmentSlots';

export { APPOINTMENT_SLOT_DURATION_MINUTES };

/** Build ISO datetime without validation — safe for display and slot grids. */
export function composeScanDateTime(date: string, slotOrLabel: string): string | null {
  return composeAppointmentDateTime(date, slotOrLabel);
}

export function isScanDateTimeInPast(date: string, slotOrLabel: string): boolean {
  const iso = composeScanDateTime(date, slotOrLabel);
  if (!iso) return true;
  return new Date(iso).getTime() <= Date.now();
}

/** Validates and returns ISO datetime — use only on submit, not during render. */
export function buildScanScheduledAt(date: string, slotOrLabel: string): string {
  return buildAppointmentScheduledAt(date, slotOrLabel);
}

export function getScanTimeSlots(date: string): TimeSlotOption[] {
  const day = new Date(`${date}T12:00:00`).getDay();
  const isSaturday = day === 6;
  const blockedCodes: string[] = isSaturday ? ['16:30', '17:15'] : [];
  return getAppointmentTimeSlots(date, { blockedCodes });
}

/** Prefer tomorrow when stored schedule dates are in the past (completed / locked steps). */
export function defaultEditableScanDate(order: LiverCareOrder): string {
  return defaultEditableAppointmentDate(order.scanScheduledAt, order.scanPatientPreferredAt);
}

export function normalizeSlotCode(slotOrLabel?: string | null): string {
  return normalizeAppointmentSlotCode(slotOrLabel);
}

export function isPaymentReadyForScan(order: LiverCareOrder): boolean {
  return (
    order.paymentStatus === 'success' ||
    !['draft', 'created', 'payment_pending'].includes(order.orderStatus)
  );
}

export function getScanSchedulePrerequisites(
  order: LiverCareOrder,
  options?: { hasAddress?: boolean },
): ScanSchedulePrerequisite[] {
  const hasAddress = options?.hasAddress ?? true;

  return [
    {
      id: 'payment',
      label: 'Payment received',
      met: isPaymentReadyForScan(order),
      owner: 'patient',
    },
    {
      id: 'date',
      label: 'Home visit date and 45-min slot selected',
      met: Boolean(order.scanPatientPreferredAt || order.scanScheduledAt),
      owner: 'patient',
    },
    {
      id: 'address',
      label: 'Home address on file',
      met: hasAddress,
      owner: 'patient',
    },
    {
      id: 'technician',
      label: 'Technician assigned by operations',
      met: Boolean(order.technicianId),
      owner: 'operations',
    },
  ];
}

export function canOpsConfirmScanSchedule(order: LiverCareOrder, options?: { hasAddress?: boolean }): boolean {
  const prereqs = getScanSchedulePrerequisites(order, options);
  return prereqs.every((p) => p.met);
}

export function formatScanVisitSummary(order: LiverCareOrder): string {
  const at = order.scanScheduledAt ?? order.scanPatientPreferredAt;
  if (!at) return 'Not scheduled';
  const slot = order.scanTimeSlot ? ` · ${formatTimeSlotDisplay(order.scanTimeSlot)}` : '';
  const pending = !order.scanScheduledAt && order.scanPatientPreferredAt ? ' (patient preference)' : '';
  return `${FIBROSCAN_VISIT_LABEL}${slot} · ${new Date(at).toLocaleString()}${pending}`;
}
