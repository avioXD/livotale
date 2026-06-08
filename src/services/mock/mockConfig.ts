/** When true, all services use local mock handlers instead of HTTP (see VITE_MOCK_MODE). */
export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

export function isMockMode(): boolean {
  return MOCK_MODE;
}
