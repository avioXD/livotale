import { ADMIN_ROLES, OPS_ROLES } from '@/app/config/productRoles';
import { AppRole } from '@/types';

const STAFF_ROLES = [
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
] as const;

/** Central route-role map for 012 liver care platform (aligns with spec-rbac-screens.md). */
export const LIVER_CARE_ROUTE_ROLES = {
  dashboard: [...STAFF_ROLES],
  staffNotifications: [...STAFF_ROLES],
  patients: [AppRole.DOCTOR, ...OPS_ROLES],
  /** Legacy journey Rx review — doctor + admin oversight only; ops uses order detail. */
  prescriptions: [AppRole.PATIENT, AppRole.DOCTOR, ...ADMIN_ROLES],
  treatmentPlans: [AppRole.PATIENT, AppRole.DOCTOR, ...OPS_ROLES],
  adminOperations: [...OPS_ROLES],
  adminEnquiries: [...OPS_ROLES],
  adminPackages: [...ADMIN_ROLES],
  adminLabPartners: [...OPS_ROLES],
  adminNotifications: [...OPS_ROLES],
  adminAudit: [...ADMIN_ROLES],
  adminIntegrations: [...ADMIN_ROLES],
  doctorConsultations: [AppRole.DOCTOR],
  doctorAppointments: [AppRole.DOCTOR],
  technician: [AppRole.TECHNICIAN],
  staffProfile: [
    AppRole.DOCTOR,
    AppRole.TECHNICIAN,
    AppRole.OPERATIONS,
    AppRole.CITY_MANAGER,
    AppRole.SUPER_ADMIN,
  ],
} as const;
