/** WebSocket origin derived from API base (supports relative `/api/v1` behind nginx). */
export function resolveWsOrigin(
  apiBase: string,
  pageOrigin: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
): string {
  const resolved = /^https?:\/\//i.test(apiBase)
    ? new URL(apiBase)
    : new URL(apiBase, pageOrigin);
  const protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${resolved.host}`;
}
