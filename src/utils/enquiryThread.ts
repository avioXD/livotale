import type { Enquiry } from '@/types/enquiry';

export function normalizeEnquiryPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function threadIdFromPhone(phone: string): string {
  return `thread-${normalizeEnquiryPhone(phone)}`;
}

export function latestPerThread(enquiries: Enquiry[]): Enquiry[] {
  const map = new Map<string, Enquiry>();
  for (const e of enquiries) {
    const cur = map.get(e.threadId);
    if (!cur || e.threadSequence > cur.threadSequence) {
      map.set(e.threadId, e);
    }
  }
  return [...map.values()];
}

export function threadCounts(enquiries: Enquiry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of enquiries) {
    counts.set(e.threadId, (counts.get(e.threadId) ?? 0) + 1);
  }
  return counts;
}

export function inheritedPatientIdFromThread(enquiries: Enquiry[]): string | null {
  const withPatient = enquiries.filter((e) => e.patientId);
  if (withPatient.length === 0) return null;
  return withPatient.sort((a, b) => b.threadSequence - a.threadSequence)[0].patientId ?? null;
}

export function nextThreadSequence(enquiries: Enquiry[], threadId: string): number {
  const siblings = enquiries.filter((e) => e.threadId === threadId);
  if (siblings.length === 0) return 1;
  return Math.max(...siblings.map((e) => e.threadSequence)) + 1;
}

export function getLatestThreadEnquiry(threadEnquiries: Enquiry[]): Enquiry | null {
  if (threadEnquiries.length === 0) return null;
  return threadEnquiries.reduce((a, b) => (a.threadSequence > b.threadSequence ? a : b));
}

/** Older converted/closed threads — view-only, no CRM tabs. */
export function isArchivedConvertedThread(
  enquiry: Enquiry,
  threadEnquiries: Enquiry[],
): boolean {
  if (enquiry.status !== 'converted' && enquiry.status !== 'closed') return false;
  const latest = getLatestThreadEnquiry(threadEnquiries);
  return latest != null && latest.id !== enquiry.id;
}

/** Active lead — follow-up, create order, edit details. */
export function isActiveCrmThread(enquiry: Enquiry, threadEnquiries: Enquiry[]): boolean {
  if (isArchivedConvertedThread(enquiry, threadEnquiries)) return false;
  return enquiry.status !== 'converted' && enquiry.status !== 'closed';
}

/** Latest thread that converted — order outcome tab only. */
export function isConvertedLatestThread(
  enquiry: Enquiry,
  threadEnquiries: Enquiry[],
): boolean {
  if (enquiry.status !== 'converted') return false;
  const latest = getLatestThreadEnquiry(threadEnquiries);
  return latest?.id === enquiry.id;
}
