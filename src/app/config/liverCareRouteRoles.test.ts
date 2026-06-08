import { AppRole } from '@/types';
import { canAccessRoute } from '@/rbac';
import { LIVER_CARE_ROUTE_ROLES } from './liverCareRouteRoles';

describe('liverCareRouteRoles', () => {
  it('admin can access dashboard and audit', () => {
    expect(canAccessRoute(AppRole.SUPER_ADMIN, [...LIVER_CARE_ROUTE_ROLES.dashboard])).toBe(true);
    expect(canAccessRoute(AppRole.SUPER_ADMIN, [...LIVER_CARE_ROUTE_ROLES.adminAudit])).toBe(true);
    expect(canAccessRoute(AppRole.SUPER_ADMIN, [...LIVER_CARE_ROUTE_ROLES.adminPackages])).toBe(true);
  });

  it('all staff can access dashboard and inbox notifications', () => {
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.dashboard])).toBe(true);
    expect(canAccessRoute(AppRole.TECHNICIAN, [...LIVER_CARE_ROUTE_ROLES.dashboard])).toBe(true);
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.dashboard])).toBe(true);
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.staffNotifications])).toBe(true);
    expect(canAccessRoute(AppRole.TECHNICIAN, [...LIVER_CARE_ROUTE_ROLES.staffNotifications])).toBe(true);
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.staffNotifications])).toBe(true);
  });

  it('operations cannot access admin-only routes', () => {
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.adminAudit])).toBe(false);
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.adminPackages])).toBe(false);
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.adminIntegrations])).toBe(false);
  });

  it('operations can access ops hub and notifications', () => {
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.adminOperations])).toBe(true);
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.adminNotifications])).toBe(true);
  });

  it('doctor can access consultations but not ops hub', () => {
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.doctorConsultations])).toBe(true);
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.adminOperations])).toBe(false);
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.patients])).toBe(true);
  });

  it('technician is limited to field routes', () => {
    expect(canAccessRoute(AppRole.TECHNICIAN, [...LIVER_CARE_ROUTE_ROLES.technician])).toBe(true);
    expect(canAccessRoute(AppRole.TECHNICIAN, [...LIVER_CARE_ROUTE_ROLES.patients])).toBe(false);
    expect(canAccessRoute(AppRole.TECHNICIAN, [...LIVER_CARE_ROUTE_ROLES.adminOperations])).toBe(false);
  });

  it('operations cannot access legacy prescriptions review', () => {
    expect(canAccessRoute(AppRole.OPERATIONS, [...LIVER_CARE_ROUTE_ROLES.prescriptions])).toBe(false);
    expect(canAccessRoute(AppRole.DOCTOR, [...LIVER_CARE_ROUTE_ROLES.prescriptions])).toBe(true);
  });
});
