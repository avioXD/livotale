import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import type { StaffComplianceDocument, StaffFullProfile } from '@/types/staffProfile';
import { staffProfileConfig } from '@/app/pages/staff/profile/staffProfileConfig';

function demoDocs(role: StaffRoleKey, memberId: string): StaffComplianceDocument[] {
  const required = staffProfileConfig(role).requiredDocuments;
  return required.slice(0, Math.min(3, required.length)).map((type, i) => ({
    id: `demo-${memberId}-doc-${i}`,
    documentType: type,
    documentNumber: `DEMO-${type.toUpperCase()}-001`,
    fileId: null,
    storageUrl: null,
    issuedOn: '2024-01-01',
    expiresOn: i === 0 ? '2026-12-31' : null,
    status: i === 0 ? 'verified' : 'pending',
    verifiedAt: i === 0 ? new Date().toISOString() : null,
    notes: null,
    createdAt: new Date().toISOString(),
  }));
}

export function buildDemoStaffProfile(role: StaffRoleKey, member: StaffMemberRow): StaffFullProfile {
  return {
    id: member.id,
    role,
    userId: null,
    employeeCode: member.subtitle.split('·')[0]?.trim() ?? null,
    fullName: member.fullName,
    email: member.email ?? null,
    mobile: member.mobile ?? null,
    gender: null,
    dob: null,
    verificationStatus: member.status === 'active' || member.status === 'available' ? 'verified' : 'pending',
    status: member.status,
    employee: {
      homeLine1: 'Demo address line 1',
      homeLine2: null,
      homeCity: 'Mumbai',
      homeState: 'Maharashtra',
      homePincode: '400001',
      emergencyContactName: 'Emergency contact',
      emergencyContactMobile: '+91 90000 00000',
      emergencyContactRelation: 'Family',
      qualification: 'Demo qualification',
      certification: 'Demo certification',
      registrationNumber: role === 'doctor' ? 'MCI-DEMO-001' : null,
      clinicOrOrgName: role === 'lab_partner' || role === 'pharmacy' ? member.fullName : null,
      specialization: role === 'doctor' ? 'Hepatology' : null,
      vehicleType: role === 'technician' ? 'Two-wheeler' : null,
      vehicleNumber: role === 'technician' ? 'MH-01-DM-0001' : null,
      joinedOn: '2024-06-01',
      bankAccountLast4: '1234',
      additionalNotes: 'Demo HR profile — connect staff profile API for live records.',
    },
    documents: demoDocs(role, member.id),
    meta: {},
  };
}

const profileCache = new Map<string, StaffFullProfile>();

function cacheKey(role: StaffRoleKey, memberId: string) {
  return `${role}:${memberId}`;
}

export function getCachedStaffProfile(role: StaffRoleKey, member: StaffMemberRow): StaffFullProfile {
  const key = cacheKey(role, member.id);
  if (!profileCache.has(key)) {
    profileCache.set(key, buildDemoStaffProfile(role, member));
  }
  return { ...profileCache.get(key)! };
}

export function updateCachedStaffProfile(role: StaffRoleKey, memberId: string, patch: Partial<StaffFullProfile>) {
  const key = cacheKey(role, memberId);
  const current = profileCache.get(key) ?? buildDemoStaffProfile(role, {
    id: memberId,
    fullName: 'Staff member',
    subtitle: '',
    status: 'active',
    metrics: [],
  });
  profileCache.set(key, { ...current, ...patch });
  return profileCache.get(key)!;
}
