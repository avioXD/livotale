import type { TimeSlotOption } from '@/types';
import type { LiverCareOrder, ScanVisitMode } from '@/types/serviceOrder';

export const SCAN_VISIT_MODE_LABELS: Record<ScanVisitMode, string> = {
  clinic: 'Clinic visit',
  home: 'Home visit',
};

export const SCAN_CLINIC_LOCATIONS = [
  'Livotale Liver Clinic — Lower Parel',
  'Livotale Liver Clinic — Bandra',
  'Livotale Liver Clinic — Andheri',
] as const;

const SLOT_DEFS = [
  { code: '09:00', label: '09:00 AM', hour: 9, minute: 0 },
  { code: '10:00', label: '10:00 AM', hour: 10, minute: 0 },
  { code: '11:00', label: '11:00 AM', hour: 11, minute: 0 },
  { code: '12:00', label: '12:00 PM', hour: 12, minute: 0 },
  { code: '14:00', label: '02:00 PM', hour: 14, minute: 0 },
  { code: '15:00', label: '03:00 PM', hour: 15, minute: 0 },
  { code: '16:00', label: '04:00 PM', hour: 16, minute: 0 },
  { code: '17:00', label: '05:00 PM', hour: 17, minute: 0 },
] as const;

export interface ScanSchedulePrerequisite {
  id: string;
  label: string;
  met: boolean;
  owner: 'patient' | 'operations';
}

function findSlotDef(slotOrLabel: string) {
  const normalized = slotOrLabel.trim();
  return SLOT_DEFS.find(
    (s) =>
      s.code === normalized ||
      s.label === normalized ||
      s.label.toLowerCase() === normalized.toLowerCase(),
  );
}

/** Build ISO datetime without validation — safe for display and slot grids. */
export function composeScanDateTime(date: string, slotOrLabel: string): string | null {
  const slot = findSlotDef(slotOrLabel);
  if (!slot) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(slot.hour, slot.minute, 0, 0);
  return d.toISOString();
}

export function isScanDateTimeInPast(date: string, slotOrLabel: string): boolean {
  const iso = composeScanDateTime(date, slotOrLabel);
  if (!iso) return true;
  return new Date(iso).getTime() <= Date.now();
}

/** Validates and returns ISO datetime — use only on submit, not during render. */
export function buildScanScheduledAt(date: string, slotOrLabel: string): string {
  const iso = composeScanDateTime(date, slotOrLabel);
  if (!iso) throw new Error('Invalid date or time slot');
  if (new Date(iso).getTime() <= Date.now()) throw new Error('Scan must be scheduled in the future');
  return iso;
}

export function getScanTimeSlots(date: string, visitMode: ScanVisitMode): TimeSlotOption[] {
  const day = new Date(`${date}T12:00:00`).getDay();
  const isSunday = day === 0;
  const isSaturday = day === 6;
  const now = Date.now();

  return SLOT_DEFS.map((slot) => {
    let available = !isSunday;
    if (visitMode === 'home' && isSaturday && ['16:00', '17:00'].includes(slot.code)) {
      available = false;
    }
    if (visitMode === 'clinic' && isSaturday && ['09:00', '17:00'].includes(slot.code)) {
      available = false;
    }
    const scheduledAt = composeScanDateTime(date, slot.code);
    if (scheduledAt && new Date(scheduledAt).getTime() <= now) {
      available = false;
    }
    return {
      code: slot.code,
      label: slot.label,
      available,
      scheduledAt: scheduledAt ?? undefined,
    };
  });
}

/** Prefer tomorrow when stored schedule dates are in the past (completed / locked steps). */
export function defaultEditableScanDate(order: LiverCareOrder): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const stored = order.scanScheduledAt?.slice(0, 10) ?? order.scanPatientPreferredAt?.slice(0, 10);
  if (!stored) return tomorrowStr;

  const storedEnd = new Date(`${stored}T23:59:59`);
  if (storedEnd.getTime() < Date.now()) return tomorrowStr;
  return stored;
}

export function normalizeSlotCode(slotOrLabel?: string | null): string {
  if (!slotOrLabel) return '';
  const slot = findSlotDef(slotOrLabel);
  return slot?.code ?? '';
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
  const visitMode = order.scanVisitMode ?? null;

  return [
    {
      id: 'payment',
      label: 'Payment received',
      met: isPaymentReadyForScan(order),
      owner: 'patient',
    },
    {
      id: 'visit_mode',
      label: 'Visit type selected (clinic or home)',
      met: Boolean(visitMode),
      owner: 'patient',
    },
    {
      id: 'date',
      label: 'Scan date and time slot selected',
      met: Boolean(order.scanPatientPreferredAt || order.scanScheduledAt),
      owner: 'patient',
    },
    {
      id: 'address',
      label: 'Home address on file (home visits only)',
      met: visitMode !== 'home' || hasAddress,
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
  const mode = order.scanVisitMode ? SCAN_VISIT_MODE_LABELS[order.scanVisitMode] : 'Visit';
  const slot = order.scanTimeSlot ? ` · ${order.scanTimeSlot}` : '';
  const location =
    order.scanVisitMode === 'clinic' && order.scanClinicLocation
      ? ` · ${order.scanClinicLocation}`
      : '';
  const pending = !order.scanScheduledAt && order.scanPatientPreferredAt ? ' (patient preference)' : '';
  return `${mode}${slot} · ${new Date(at).toLocaleString()}${location}${pending}`;
}
