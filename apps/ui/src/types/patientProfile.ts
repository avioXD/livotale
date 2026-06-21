import { AppRole } from './auth';

export function canEditPatientProfile(role: AppRole | null, roles: AppRole[] = []): boolean {
  const effective = roles.length > 0 ? roles : role ? [role] : [];
  return effective.some(
    (r) => r === AppRole.OPERATIONS || r === AppRole.CITY_MANAGER || r === AppRole.SUPER_ADMIN,
  );
}

export function isDoctorRole(role: AppRole | null): boolean {
  return role === AppRole.DOCTOR;
}
