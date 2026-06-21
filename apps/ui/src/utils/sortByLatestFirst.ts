const TIMESTAMP_KEYS = [
  'updatedAt',
  'updated_at',
  'createdAt',
  'created_at',
  'sentAt',
  'sent_at',
  'enquiryAt',
  'enquiry_at',
  'uploadedAt',
  'uploaded_at',
  'reportUploadedAt',
  'scheduledStart',
  'scheduled_start',
  'occurredAt',
  'occurred_at',
  'publishedAt',
  'published_at',
  'paidAt',
  'paid_at',
] as const;

function readTimestamp(value: unknown): number {
  if (value == null || value === '') return 0;
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Latest created/updated (or related activity) timestamp on a row, for default table sort. */
export function getLatestRowTimestamp(row: Record<string, unknown>): number {
  let latest = 0;
  for (const key of TIMESTAMP_KEYS) {
    latest = Math.max(latest, readTimestamp(row[key]));
  }
  return latest;
}

/** Return a copy sorted newest-first using created/updated (or activity) timestamps. */
export function sortByLatestFirst<T>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const rightTs = getLatestRowTimestamp(right as Record<string, unknown>);
    const leftTs = getLatestRowTimestamp(left as Record<string, unknown>);
    return rightTs - leftTs;
  });
}
