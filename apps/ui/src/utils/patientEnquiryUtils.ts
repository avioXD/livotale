import type { PatientEnquiry } from '@/types/patientPortal';

const CLOSED_ENQUIRY_STATUSES = new Set(['converted', 'closed', 'not_interested']);

export function isOpenPatientEnquiry(enquiry: PatientEnquiry): boolean {
  return !CLOSED_ENQUIRY_STATUSES.has(enquiry.status);
}

export function formatEnquiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function enquiryMessagePreview(message?: string | null, maxLength = 120): string | null {
  if (!message?.trim()) return null;
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}
