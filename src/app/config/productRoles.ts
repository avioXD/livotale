import { AppRole } from '@/types';

/** Roles with a full product sidebar (liver fibrosis scan clinic). */
export const PRODUCT_ROLES = [
  AppRole.PATIENT,
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
] as const;

/** Platform admin — organizational + monitoring + reports. */
export const ADMIN_ROLES = [AppRole.SUPER_ADMIN, AppRole.CITY_MANAGER] as const;

/** Day-to-day clinic operations (booking, patients, lab orders, technician assignment). */
export const OPS_ROLES = [AppRole.OPERATIONS, ...ADMIN_ROLES] as const;

/** Legacy API roles — no sidebar modules; settings only. */
export const DEPRECATED_UI_ROLES = [
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.PHARMACY,
  AppRole.LAB_PARTNER,
] as const;

export function isAdminRole(role: AppRole | null): boolean {
  return role != null && (ADMIN_ROLES as readonly AppRole[]).includes(role);
}

export function isOpsRole(role: AppRole | null): boolean {
  return role != null && (OPS_ROLES as readonly AppRole[]).includes(role);
}

export function isDeprecatedUiRole(role: AppRole | null): boolean {
  return role != null && (DEPRECATED_UI_ROLES as readonly AppRole[]).includes(role);
}
