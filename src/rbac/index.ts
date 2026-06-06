import { AppRole, type JwtPayload } from '@/types';

const TOKEN_KEY = 'livotel_access_token';
const REFRESH_TOKEN_KEY = 'livotel_refresh_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function getRoleFromToken(token: string): AppRole | null {
  const payload = decodeJwt(token);
  return payload?.role ?? null;
}

export function hasRole(userRole: AppRole | null, allowedRoles: AppRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function canAccessRoute(userRole: AppRole | null, allowedRoles: AppRole[]): boolean {
  if (allowedRoles.length === 0) return true;
  return hasRole(userRole, allowedRoles);
}

export const ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.PATIENT]: 'Patient',
  [AppRole.TECHNICIAN]: 'Technician',
  [AppRole.DOCTOR]: 'Doctor',
  [AppRole.ADMIN]: 'Admin',
};

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  [AppRole.PATIENT]: 1,
  [AppRole.TECHNICIAN]: 2,
  [AppRole.DOCTOR]: 3,
  [AppRole.ADMIN]: 4,
};

export function hasMinimumRole(userRole: AppRole | null, minimumRole: AppRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
