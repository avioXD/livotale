import { resolveWsOrigin } from '@/utils/resolveWsOrigin';

describe('resolveWsOrigin', () => {
  it('uses page origin when API base is relative', () => {
    expect(resolveWsOrigin('/api/v1', 'http://localhost:8080')).toBe('ws://localhost:8080');
  });

  it('derives wss from absolute https API base', () => {
    expect(resolveWsOrigin('https://app.livotale.com/api/v1')).toBe('wss://app.livotale.com');
  });

  it('derives ws from absolute http API base', () => {
    expect(resolveWsOrigin('http://localhost:3008/api/v1')).toBe('ws://localhost:3008');
  });
});
