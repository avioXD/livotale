import type { PatientPortalSession, PatientProfile } from '@/types/patientPortal';

export interface EnquiryPatientPrefill {
  patientName: string;
  phone: string;
  email?: string;
  city?: string;
  age?: string;
  gender?: string;
}

/** Whole years from ISO date (YYYY-MM-DD); returns 0 if invalid or future. */
export function ageFromDateOfBirth(dateOfBirth: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : 0;
}

export function enquiryPrefillFromPatient(
  session: PatientPortalSession,
  profile?: PatientProfile | null,
): EnquiryPatientPrefill {
  const prefill: EnquiryPatientPrefill = {
    patientName: session.patientName,
    phone: session.phone,
  };

  if (!profile) return prefill;

  if (profile.email?.trim()) prefill.email = profile.email.trim();
  if (profile.city?.trim()) prefill.city = profile.city.trim();

  if (profile.dateOfBirth) {
    const age = ageFromDateOfBirth(profile.dateOfBirth);
    if (age >= 1 && age <= 120) prefill.age = String(age);
  }

  const gender = profile.gender?.trim().toLowerCase();
  if (gender && gender !== 'undisclosed' && ['male', 'female', 'other'].includes(gender)) {
    prefill.gender = gender;
  }

  return prefill;
}
