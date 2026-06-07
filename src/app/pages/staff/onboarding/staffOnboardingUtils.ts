import { staffProfileConfig } from '@/app/pages/staff/profile/staffProfileConfig';
import type { StaffRoleKey } from '@/types/staffHub';
import type { StaffComplianceDocument, StaffFullProfile } from '@/types/staffProfile';

export function isStaffProfileComplete(_role: StaffRoleKey, profile: StaffFullProfile): boolean {
  const emp = profile.employee;
  if (!emp) return false;

  const values: Record<string, string | null | undefined> = {
    fullName: profile.fullName,
    email: profile.email,
    mobile: profile.mobile,
    homeLine1: emp.homeLine1,
    homeCity: emp.homeCity,
    homePincode: emp.homePincode,
    emergencyContactName: emp.emergencyContactName,
    emergencyContactMobile: emp.emergencyContactMobile,
    registrationNumber: emp.registrationNumber,
    specialization: emp.specialization,
    clinicOrOrgName: emp.clinicOrOrgName,
    qualification: emp.qualification,
    certification: emp.certification,
  };

  const core = ['homeLine1', 'homeCity', 'homePincode', 'emergencyContactName', 'emergencyContactMobile'];
  return core.every((k) => Boolean(values[k]?.trim()));
}

export function isStaffVerificationComplete(role: StaffRoleKey, documents: StaffComplianceDocument[]): boolean {
  const required = staffProfileConfig(role).requiredDocuments;
  return required.every((type) =>
    documents.some((d) => d.documentType === type && d.status === 'verified'),
  );
}

export function hasAllRequiredDocumentsUploaded(
  role: StaffRoleKey,
  documents: StaffComplianceDocument[],
): boolean {
  const required = staffProfileConfig(role).requiredDocuments;
  return required.every((type) => documents.some((d) => d.documentType === type));
}

export function staffOnboardingLink(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/staff/onboard/${token}`;
}

export function staffRegisterLink(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/staff/register?invite=${token}`;
}
