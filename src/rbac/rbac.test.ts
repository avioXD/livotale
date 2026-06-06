import { AppRole } from '@/types';
import { canAccessRoute, hasRole } from '@/rbac';

describe('rbac', () => {
  it('hasRole returns true when role is allowed', () => {
    expect(hasRole(AppRole.DOCTOR, [AppRole.DOCTOR, AppRole.SUPER_ADMIN])).toBe(true);
  });

  it('hasRole returns false when role is not allowed', () => {
    expect(hasRole(AppRole.PATIENT, [AppRole.DOCTOR, AppRole.SUPER_ADMIN])).toBe(false);
  });

  it('canAccessRoute allows empty allow list', () => {
    expect(canAccessRoute(AppRole.PATIENT, [])).toBe(true);
  });

  it('canAccessRoute checks role membership', () => {
    expect(canAccessRoute(AppRole.SUPER_ADMIN, [AppRole.SUPER_ADMIN])).toBe(true);
    expect(canAccessRoute(AppRole.TECHNICIAN, [AppRole.SUPER_ADMIN])).toBe(false);
  });
});
