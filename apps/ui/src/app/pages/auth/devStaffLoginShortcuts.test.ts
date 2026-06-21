describe('DEV_STAFF_LOGIN_SHORTCUTS', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__;
    jest.resetModules();
  });

  it('exposes shortcuts when VITE_APP_ENV resolves to dev', async () => {
    (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__ = 'dev';
    const { DEV_STAFF_LOGIN_SHORTCUTS } = await import('./devStaffLoginShortcuts');

    expect(DEV_STAFF_LOGIN_SHORTCUTS.length).toBeGreaterThan(0);
  });

  it('hides shortcuts outside dev mode', async () => {
    (globalThis as typeof globalThis & { __APP_ENV__?: string }).__APP_ENV__ = 'production';
    const { DEV_STAFF_LOGIN_SHORTCUTS } = await import('./devStaffLoginShortcuts');

    expect(DEV_STAFF_LOGIN_SHORTCUTS).toEqual([]);
  });
});

