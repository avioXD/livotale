import { AppRole } from '@/types';
import {
  mapApiRoleCode,
  mapApiRoles,
  pickPrimaryRole,
  hasPermission,
} from '@/utils/authMappers';

describe('authMappers', () => {
  it('maps all 10 API roles to distinct AppRoles', () => {
    expect(mapApiRoleCode('patient')).toBe(AppRole.PATIENT);
    expect(mapApiRoleCode('technician')).toBe(AppRole.TECHNICIAN);
    expect(mapApiRoleCode('doctor')).toBe(AppRole.DOCTOR);
    expect(mapApiRoleCode('dietician')).toBe(AppRole.DIETICIAN);
    expect(mapApiRoleCode('health_coach')).toBe(AppRole.HEALTH_COACH);
    expect(mapApiRoleCode('pharmacy')).toBe(AppRole.PHARMACY);
    expect(mapApiRoleCode('lab_partner')).toBe(AppRole.LAB_PARTNER);
    expect(mapApiRoleCode('support')).toBe(AppRole.OPERATIONS);
    expect(mapApiRoleCode('city_manager')).toBe(AppRole.CITY_MANAGER);
    expect(mapApiRoleCode('admin')).toBe(AppRole.SUPER_ADMIN);
  });

  it('deduplicates mapped roles', () => {
    expect(mapApiRoles(['health_coach', 'dietician'])).toEqual([
      AppRole.HEALTH_COACH,
      AppRole.DIETICIAN,
    ]);
  });

  it('picks highest priority role', () => {
    expect(pickPrimaryRole([AppRole.TECHNICIAN, AppRole.SUPER_ADMIN])).toBe(AppRole.SUPER_ADMIN);
    expect(pickPrimaryRole([AppRole.PATIENT, AppRole.DOCTOR])).toBe(AppRole.DOCTOR);
  });

  it('checks permissions on user', () => {
    const user = {
      id: '1',
      username: 'test',
      email: null,
      mobile: null,
      fullName: 'Test',
      roles: [AppRole.DOCTOR],
      role: AppRole.DOCTOR,
      permissions: ['doctor.view_assigned_patient'],
    };
    expect(hasPermission(user, 'doctor.view_assigned_patient')).toBe(true);
  });
});
