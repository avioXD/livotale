/** Tab-scoped staff auth storage (sessionStorage). Patient portal uses separate localStorage keys. */

export const ACCESS_TOKEN_KEY = 'livotale_access_token';
export const REFRESH_TOKEN_KEY = 'livotale_refresh_token';
export const AUTH_PERSIST_KEY = 'livotale-auth';

const LEGACY_LOCAL_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_PERSIST_KEY] as const;

function staffAuthStorage(): Storage {
  return sessionStorage;
}

export function getStaffAuthItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return staffAuthStorage().getItem(key);
}

export function setStaffAuthItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  staffAuthStorage().setItem(key, value);
}

export function removeStaffAuthItem(key: string): void {
  if (typeof window === 'undefined') return;
  staffAuthStorage().removeItem(key);
}

function sessionHasStaffAuth(): boolean {
  return Boolean(
    getStaffAuthItem(ACCESS_TOKEN_KEY) || getStaffAuthItem(AUTH_PERSIST_KEY),
  );
}

/** Copy legacy shared localStorage staff keys into this tab's sessionStorage once. */
export function migrateLegacyStaffAuthFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  if (sessionHasStaffAuth()) return;

  let migrated = false;
  for (const key of LEGACY_LOCAL_KEYS) {
    const value = localStorage.getItem(key);
    if (!value) continue;
    setStaffAuthItem(key, value);
    localStorage.removeItem(key);
    migrated = true;
  }

  if (migrated && process.env.NODE_ENV !== 'production') {
    console.info('[auth] Migrated staff session from localStorage to sessionStorage for this tab.');
  }
}

function runStaffAuthBootMigration(): void {
  migrateLegacyStaffAuthFromLocalStorage();
}

if (typeof window !== 'undefined') {
  runStaffAuthBootMigration();
}
