const DEFAULT_MS = 120;

/** Simulate network latency in mock mode. */
export function mockDelay(ms = DEFAULT_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
