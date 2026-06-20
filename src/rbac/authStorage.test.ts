import {
  ACCESS_TOKEN_KEY,
  AUTH_PERSIST_KEY,
  REFRESH_TOKEN_KEY,
  getStaffAuthItem,
  migrateLegacyStaffAuthFromLocalStorage,
  setStaffAuthItem,
} from '@/rbac/authStorage';
import { clearStoredTokens, getStoredToken, setStoredTokens } from '@/rbac';

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores staff tokens in sessionStorage', () => {
    setStoredTokens('access-abc', 'refresh-xyz');

    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-abc');
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-xyz');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(getStoredToken()).toBe('access-abc');
  });

  it('clears staff tokens from sessionStorage only', () => {
    setStoredTokens('access-abc', 'refresh-xyz');
    clearStoredTokens();

    expect(getStoredToken()).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('migrates legacy localStorage staff keys into sessionStorage once', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'legacy-access');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'legacy-refresh');
    localStorage.setItem(AUTH_PERSIST_KEY, '{"state":{"isAuthenticated":true}}');

    migrateLegacyStaffAuthFromLocalStorage();

    expect(getStaffAuthItem(ACCESS_TOKEN_KEY)).toBe('legacy-access');
    expect(getStaffAuthItem(REFRESH_TOKEN_KEY)).toBe('legacy-refresh');
    expect(getStaffAuthItem(AUTH_PERSIST_KEY)).toBe('{"state":{"isAuthenticated":true}}');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_PERSIST_KEY)).toBeNull();
  });

  it('skips migration when sessionStorage already has staff auth', () => {
    setStaffAuthItem(ACCESS_TOKEN_KEY, 'tab-access');
    localStorage.setItem(ACCESS_TOKEN_KEY, 'legacy-access');

    migrateLegacyStaffAuthFromLocalStorage();

    expect(getStaffAuthItem(ACCESS_TOKEN_KEY)).toBe('tab-access');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('legacy-access');
  });
});
