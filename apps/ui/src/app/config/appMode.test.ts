import { isDevAppEnv, normalizeAppEnv } from './appMode';

describe('appMode', () => {
  it('normalizes blank mode to production', () => {
    expect(normalizeAppEnv()).toBe('production');
    expect(normalizeAppEnv('   ')).toBe('production');
  });

  it('treats only dev as dev mode', () => {
    expect(isDevAppEnv('dev')).toBe(true);
    expect(isDevAppEnv(' DEV ')).toBe(true);
    expect(isDevAppEnv('development')).toBe(false);
    expect(isDevAppEnv('production')).toBe(false);
  });
});

