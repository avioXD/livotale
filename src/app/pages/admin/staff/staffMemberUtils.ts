import { getDemoStaffMembers } from '@/data/staffHubDemoData';
import type { StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import { staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';

export function staffMemberDetailPath(roleKey: StaffRoleKey, memberId: string): string {
  return `${staffRolePath(roleKey)}/${memberId}`;
}

export function mapTechniciansToRows(rows: StaffTechnicianProfile[]): StaffMemberRow[] {
  return rows.map((t) => ({
    id: t.id,
    fullName: t.fullName,
    subtitle: `${t.employeeCode} · ${t.technicianType ?? 'technician'}`,
    status: t.status,
    email: t.email,
    mobile: t.mobile,
    metrics: [
      { label: 'Collected', value: t.samplesCollected },
      { label: 'Handed over', value: t.samplesHandedOver },
      { label: 'Completed', value: t.samplesCompleted },
    ],
  }));
}

export function mapLabPartnersToRows(rows: StaffLabPartnerProfile[]): StaffMemberRow[] {
  return rows.map((l) => ({
    id: l.id,
    fullName: l.name,
    subtitle: `${l.contactName ?? 'Contact'} · ${l.registrationNumber ?? '—'}`,
    status: l.status,
    email: l.email,
    mobile: l.mobile,
    metrics: [
      { label: 'Received', value: l.samplesReceived },
      { label: 'Reports', value: l.reportsUploaded },
      { label: 'Published', value: l.reportsPublished },
    ],
  }));
}

export function mapDoctorsToRows(rows: DoctorOption[]): StaffMemberRow[] {
  return rows.map((d) => ({
    id: d.id,
    fullName: d.fullName,
    subtitle: [d.specialization, d.clinicName].filter(Boolean).join(' · ') || 'Doctor',
    status: 'active',
    metrics: [
      { label: 'Registration', value: d.registrationNumber ?? '—' },
      { label: 'Qualification', value: d.qualification ?? '—' },
      { label: 'Clinic', value: d.clinicName ?? '—' },
    ],
  }));
}

export function listStaffMembersForRole(
  roleKey: StaffRoleKey,
  data: {
    technicians: StaffTechnicianProfile[];
    labPartners: StaffLabPartnerProfile[];
    doctors: DoctorOption[];
  },
): StaffMemberRow[] {
  if (roleKey === 'technician') return mapTechniciansToRows(data.technicians);
  if (roleKey === 'lab_partner') return mapLabPartnersToRows(data.labPartners);
  if (roleKey === 'doctor') return mapDoctorsToRows(data.doctors);
  return getDemoStaffMembers(roleKey);
}
