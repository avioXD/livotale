import { AppRole, type JwtPayload } from '@/types';
import { mapApiRoleCode, pickPrimaryRole } from '@/utils/authMappers';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getStaffAuthItem,
  removeStaffAuthItem,
  setStaffAuthItem,
} from '@/rbac/authStorage';

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_PERSIST_KEY } from '@/rbac/authStorage';

export function getStoredToken(): string | null {
  return getStaffAuthItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return getStaffAuthItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  setStaffAuthItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) setStaffAuthItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  removeStaffAuthItem(ACCESS_TOKEN_KEY);
  removeStaffAuthItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export function getRoleFromToken(token: string): AppRole | null {
  const payload = decodeJwt(token);
  if (!payload?.roles?.length) return null;
  const roles = payload.roles.map(mapApiRoleCode);
  if (payload.activeRole) {
    const active = mapApiRoleCode(payload.activeRole);
    if (roles.includes(active)) return active;
  }
  return pickPrimaryRole(roles);
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
  [AppRole.DIETICIAN]: 'Dietician',
  [AppRole.HEALTH_COACH]: 'Health Coach',
  [AppRole.PHARMACY]: 'Pharmacy',
  [AppRole.LAB_PARTNER]: 'Lab Partner',
  [AppRole.OPERATIONS]: 'Operations Team',
  [AppRole.CITY_MANAGER]: 'City Manager',
  [AppRole.SUPER_ADMIN]: 'Super Admin',
};

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  [AppRole.PATIENT]: 1,
  [AppRole.DIETICIAN]: 2,
  [AppRole.HEALTH_COACH]: 3,
  [AppRole.TECHNICIAN]: 4,
  [AppRole.LAB_PARTNER]: 5,
  [AppRole.PHARMACY]: 6,
  [AppRole.DOCTOR]: 7,
  [AppRole.OPERATIONS]: 8,
  [AppRole.CITY_MANAGER]: 9,
  [AppRole.SUPER_ADMIN]: 10,
};

export function hasMinimumRole(userRole: AppRole | null, minimumRole: AppRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
