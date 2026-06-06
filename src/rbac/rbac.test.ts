import { AppRole } from '@/types';
import { canAccessRoute, hasRole } from '@/rbac';

describe('RBAC utilities', () => {
  it('hasRole returns true when role is allowed', () => {
    expect(hasRole(AppRole.DOCTOR, [AppRole.DOCTOR, AppRole.ADMIN])).toBe(true);
  });

  it('hasRole returns false when role is not allowed', () => {
    expect(hasRole(AppRole.PATIENT, [AppRole.DOCTOR, AppRole.ADMIN])).toBe(false);
  });

  it('canAccessRoute allows empty role list', () => {
    expect(canAccessRoute(AppRole.PATIENT, [])).toBe(true);
  });

  it('canAccessRoute checks role membership', () => {
    expect(canAccessRoute(AppRole.ADMIN, [AppRole.ADMIN])).toBe(true);
    expect(canAccessRoute(AppRole.TECHNICIAN, [AppRole.ADMIN])).toBe(false);
  });
});
