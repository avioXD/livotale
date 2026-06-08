import type { PatientPortalSession } from '@/types/patientPortal';
import type { LiverCareOrder } from '@/types/serviceOrder';

/** Normalize Indian phone numbers for lookup (strip +91, spaces, dashes). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function resolveSessionFromOrder(order: LiverCareOrder): PatientPortalSession {
  return {
    phone: normalizePhone(order.patientPhone),
    patientId: order.patientId,
    patientName: order.patientName,
  };
}

export function resolveSessionFromOrders(
  orders: LiverCareOrder[],
  phone: string,
): PatientPortalSession | null {
  const order = orders.find((o) => phonesMatch(o.patientPhone, phone));
  return order ? resolveSessionFromOrder(order) : null;
}
