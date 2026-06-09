/**
 * When true, services use in-memory mocks instead of HTTP.
 * Dev defaults to mock unless VITE_MOCK_MODE=false (copy .env.example → .env to configure).
 */
export const MOCK_MODE =
  import.meta.env.VITE_MOCK_MODE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== 'false');

export function isMockMode(): boolean {
  return MOCK_MODE;
}
