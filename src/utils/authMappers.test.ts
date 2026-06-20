import { AppRole } from '@/types';
import {
  mapApiRoleCode,
  mapApiRoles,
  pickPrimaryRole,
  hasPermission,
  toUserFromMe,
  toAuthResponse,
  toLoginLogEntry,
  toUserSession,
  formatLoginFailureReason,
  formatLoginMethod,
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

  it('maps me response fullName from API camelCase', () => {
    const user = toUserFromMe({
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'admin@livotale.com',
      mobile: null,
      roles: ['admin'],
      permissions: ['admin.manage_users'],
    });
    expect(user.fullName).toBe('Admin User');
    expect(user.permissions).toEqual(['admin.manage_users']);
  });

  it('merges permissions from login response', () => {
    const auth = toAuthResponse({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: '8h',
      permissions: ['admin.manage_users'],
      user: {
        id: '1',
        username: 'admin',
        fullName: 'Admin User',
        roles: ['admin'],
      },
    });
    expect(auth.user.permissions).toEqual(['admin.manage_users']);
  });

  it('resolves active role from API activeRole claim', () => {
    const user = toUserFromMe({
      id: '1',
      username: 'doctor',
      fullName: 'Doctor User',
      email: 'doctor@livotale.com',
      mobile: null,
      roles: ['doctor', 'support'],
      activeRole: 'support',
    });
    expect(user.role).toBe(AppRole.OPERATIONS);
    expect(user.activeRoleCode).toBe('support');
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

  it('maps login log from API camelCase', () => {
    const entry = toLoginLogEntry({
      id: 'log-1',
      loginMethod: 'password',
      success: false,
      failureReason: 'portal_denied',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: '2026-06-20T10:00:00Z',
      username: 'admin',
      fullName: 'Admin User',
    });
    expect(entry.login_method).toBe('password');
    expect(entry.failure_reason).toBe('portal_denied');
    expect(entry.ip_address).toBe('127.0.0.1');
    expect(entry.created_at).toBe('2026-06-20T10:00:00Z');
    expect(entry.full_name).toBe('Admin User');
  });

  it('maps session from API camelCase', () => {
    const session = toUserSession({
      id: 'sess-1',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla',
      deviceLabel: 'Chrome on macOS',
      isTrusted: true,
      createdAt: '2026-06-20T09:00:00Z',
      expiresAt: '2026-06-21T09:00:00Z',
    });
    expect(session.device_label).toBe('Chrome on macOS');
    expect(session.ip_address).toBe('10.0.0.1');
    expect(session.expires_at).toBe('2026-06-21T09:00:00Z');
  });

  it('formats login failure reasons for display', () => {
    expect(formatLoginFailureReason('portal_denied')).toBe('Portal access denied');
    expect(formatLoginMethod('password')).toBe('Password');
  });
});
