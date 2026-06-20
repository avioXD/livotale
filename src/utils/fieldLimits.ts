/** UI max-length guards for log-style free-text fields (DB columns are unbounded `text`). */
export const LOG_SHORT = 500;
export const LOG_MEDIUM = 2000;
export const LOG_LONG = 8000;
export const LOG_MESSAGE = 4000;

export const FIELD_LIMITS = {
  LOG_SHORT,
  LOG_MEDIUM,
  LOG_LONG,
  LOG_MESSAGE,
} as const;

export type FieldLimitKey = keyof typeof FIELD_LIMITS;

export function getFieldLimit(key: FieldLimitKey): number {
  return FIELD_LIMITS[key];
}

export function isOverFieldLimit(value: string, key: FieldLimitKey): boolean {
  return value.length > getFieldLimit(key);
}
