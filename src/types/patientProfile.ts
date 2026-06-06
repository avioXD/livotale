import { AppRole } from './auth';

export interface PatientAppointmentRecord {
  id: string;
  appointmentCode: string;
  typeName: string;
  visitMode: 'home' | 'clinic' | 'tele' | string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  doctorName?: string | null;
  technicianName?: string | null;
  chiefComplaint?: string | null;
  paymentStatus?: string;
}

export interface PatientVisitRecord {
  id: string;
  visitType: string;
  status: string;
  scheduledAt: string;
  completedAt?: string | null;
  technicianName?: string | null;
  addressSummary?: string | null;
  preferredTimeSlot?: string | null;
  checklistCompleted?: number;
  checklistTotal?: number;
}

export function canEditPatientProfile(role: AppRole | null, roles: AppRole[] = []): boolean {
  const effective = roles.length > 0 ? roles : role ? [role] : [];
  return effective.some(
    (r) => r === AppRole.OPERATIONS || r === AppRole.CITY_MANAGER || r === AppRole.SUPER_ADMIN,
  );
}

export function isDoctorRole(role: AppRole | null): boolean {
  return role === AppRole.DOCTOR;
}
