import { isMockMode } from './mockConfig';
import { mockDelay } from './mockDelay';

/**
 * Run mock handler when VITE_MOCK_MODE=true, otherwise call the API function.
 * Mock handlers may mutate in-memory state (forms, bookings, etc.).
 */
export async function mockOrApi<T>(
  mockFn: () => T | Promise<T>,
  apiFn: () => Promise<T>,
  delayMs?: number,
): Promise<T> {
  if (isMockMode()) {
    await mockDelay(delayMs);
    return mockFn();
  }
  return apiFn();
}
