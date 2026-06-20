import type { TimeSlotOption } from '@/types';

export const APPOINTMENT_SLOT_DURATION_MINUTES = 45;

const DAY_START_HOUR = 8;
const DAY_START_MINUTE = 0;
const DAY_END_HOUR = 18;
const DAY_END_MINUTE = 0;

export interface SlotDef {
  code: string;
  label: string;
  hour: number;
  minute: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatClockTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${pad2(minute)} ${period}`;
}

/** Legacy single-time labels stored before range formatting was introduced. */
function formatLegacySlotLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const minutePart = minute === 0 ? '' : `:${pad2(minute)}`;
  return `${displayHour}${minutePart} ${period}`;
}

function formatSlotLabel(
  hour: number,
  minute: number,
  durationMinutes = APPOINTMENT_SLOT_DURATION_MINUTES,
): string {
  const endTotal = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(endTotal / 60);
  const endMinute = endTotal % 60;
  return `${formatClockTime(hour, minute)} – ${formatClockTime(endHour, endMinute)}`;
}

/** Normalize stored slot codes/labels for display (supports legacy single-time values). */
export function formatTimeSlotDisplay(slotOrLabel?: string | null): string {
  if (!slotOrLabel?.trim()) return '';
  const trimmed = slotOrLabel.trim();
  if (/[–-]/.test(trimmed)) return trimmed;
  const slot = findAppointmentSlot(trimmed);
  return slot?.label ?? trimmed;
}

function buildSlotDefs(): SlotDef[] {
  const slots: SlotDef[] = [];
  const open = new Date();
  open.setHours(DAY_START_HOUR, DAY_START_MINUTE, 0, 0);
  const close = new Date();
  close.setHours(DAY_END_HOUR, DAY_END_MINUTE, 0, 0);
  const delta = APPOINTMENT_SLOT_DURATION_MINUTES * 60 * 1000;
  let cursor = open.getTime();

  while (cursor + delta <= close.getTime()) {
    const d = new Date(cursor);
    const hour = d.getHours();
    const minute = d.getMinutes();
    const code = `${pad2(hour)}:${pad2(minute)}`;
    slots.push({ code, label: formatSlotLabel(hour, minute), hour, minute });
    cursor += delta;
  }

  return slots;
}

export const APPOINTMENT_SLOT_DEFS = buildSlotDefs();

export function findAppointmentSlot(slotOrLabel: string): SlotDef | undefined {
  const normalized = slotOrLabel.trim();
  return APPOINTMENT_SLOT_DEFS.find((s) => {
    if (s.code === normalized) return true;
    if (s.label === normalized || s.label.toLowerCase() === normalized.toLowerCase()) return true;
    const legacy = formatLegacySlotLabel(s.hour, s.minute);
    return legacy === normalized || legacy.toLowerCase() === normalized.toLowerCase();
  });
}

export function composeAppointmentDateTime(date: string, slotOrLabel: string): string | null {
  const slot = findAppointmentSlot(slotOrLabel);
  if (!slot) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(slot.hour, slot.minute, 0, 0);
  return d.toISOString();
}

export function isAppointmentDateTimeInPast(date: string, slotOrLabel: string): boolean {
  const iso = composeAppointmentDateTime(date, slotOrLabel);
  if (!iso) return true;
  return new Date(iso).getTime() <= Date.now();
}

export function buildAppointmentScheduledAt(date: string, slotOrLabel: string): string {
  const iso = composeAppointmentDateTime(date, slotOrLabel);
  if (!iso) throw new Error('Invalid date or time slot');
  if (new Date(iso).getTime() <= Date.now()) throw new Error('Appointment must be scheduled in the future');
  return iso;
}

export function normalizeAppointmentSlotCode(slotOrLabel?: string | null): string {
  if (!slotOrLabel) return '';
  return findAppointmentSlot(slotOrLabel)?.code ?? '';
}

export interface AppointmentSlotOptions {
  /** Slot codes unavailable on this date (e.g. Saturday rules). */
  blockedCodes?: string[];
}

export function getAppointmentTimeSlots(
  date: string,
  options?: AppointmentSlotOptions,
): TimeSlotOption[] {
  const day = new Date(`${date}T12:00:00`).getDay();
  const isSunday = day === 0;
  const blocked = new Set(options?.blockedCodes ?? []);
  const now = Date.now();

  return APPOINTMENT_SLOT_DEFS.map((slot) => {
    let available = !isSunday && !blocked.has(slot.code);
    const scheduledAt = composeAppointmentDateTime(date, slot.code);
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

export function defaultEditableAppointmentDate(
  scheduledAt?: string | null,
  preferredAt?: string | null,
): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const stored = scheduledAt?.slice(0, 10) ?? preferredAt?.slice(0, 10);
  if (!stored) return tomorrowStr;

  const storedEnd = new Date(`${stored}T23:59:59`);
  if (storedEnd.getTime() < Date.now()) return tomorrowStr;
  return stored;
}
