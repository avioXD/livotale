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

/** Super Admin only — platform-wide config (service zones, integrations). */
export function isSuperAdmin(role: AppRole | null): boolean {
  return role === AppRole.SUPER_ADMIN;
}

/** Super Admin / City Manager — full staff CRUD (add, edit profiles, documents). */
export function canManageStaff(role: AppRole | null): boolean {
  return isAdminRole(role);
}

/** Super Admin and Operations — archive staff after assignment checks pass. */
export function canArchiveStaff(role: AppRole | null): boolean {
  return role === AppRole.SUPER_ADMIN || role === AppRole.OPERATIONS;
}

/** Super Admin and Operations — manage doctor weekly schedules and leave. */
export function canManageDoctorSchedule(role: AppRole | null): boolean {
  return isOpsRole(role);
}

export function isOpsRole(role: AppRole | null): boolean {
  return role != null && (OPS_ROLES as readonly AppRole[]).includes(role);
}

export function isDeprecatedUiRole(role: AppRole | null): boolean {
  return role != null && (DEPRECATED_UI_ROLES as readonly AppRole[]).includes(role);
}
