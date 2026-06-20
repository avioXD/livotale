import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/services/base/BaseApiService';

const SQL_FRAGMENT = /\b(relation|column|syntax error|UndefinedColumn|ProgrammingError|asyncpg)/i;
const RECENT_TOAST_MS = 30_000;
const recentToasts = new Map<string, number>();

function sanitizeTechnicalMessage(message: string): string {
  if (SQL_FRAGMENT.test(message)) {
    return 'Something went wrong on our side. If this persists, ask your administrator to run database migrations.';
  }
  if (message.length > 180) {
    return `${message.slice(0, 177)}…`;
  }
  return message;
}

export function mapApiErrorToToast(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Request failed';
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  const status = axiosError.response?.status;
  const body = axiosError.response?.data;
  const raw = body?.message ?? body?.error ?? axiosError.message ?? 'Request failed';

  if (!axiosError.response) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  switch (status) {
    case 400:
      return `Invalid request: ${sanitizeTechnicalMessage(raw)}`;
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return 'This feature is not available yet.';
    case 422:
      return `Please check your input: ${sanitizeTechnicalMessage(raw)}`;
    case 500:
    case 502:
    case 503:
      return sanitizeTechnicalMessage(
        typeof raw === 'string' && raw.length < 120 ? raw : 'Something went wrong on our side. Please try again.',
      );
    default:
      return sanitizeTechnicalMessage(String(raw));
  }
}

export function shouldToastApiError(error: unknown, requestUrl?: string): boolean {
  const axiosError = error as AxiosError<ApiErrorBody>;
  if (axiosError.response?.status === 401) {
    return false;
  }
  if (axiosError.config?.headers?.['X-Skip-Error-Toast'] === 'true') {
    return false;
  }
  const key = `${axiosError.config?.method ?? 'GET'}:${requestUrl ?? axiosError.config?.url ?? 'unknown'}`;
  const now = Date.now();
  const last = recentToasts.get(key) ?? 0;
  if (now - last < RECENT_TOAST_MS) {
    return false;
  }
  recentToasts.set(key, now);
  return true;
}
