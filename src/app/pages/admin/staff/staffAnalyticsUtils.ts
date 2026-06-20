import type { DoctorOption } from '@/types/appointments';
import type { SampleCollectionAnalytics, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { StaffRoleKey } from '@/types/staffHub';

export interface StaffGlobalKpi {
  label: string;
  value: string | number;
  hint?: string;
}

export function buildStaffGlobalKpis(
  roleKey: StaffRoleKey,
  analytics: SampleCollectionAnalytics | null,
  context: {
    technicians: StaffTechnicianProfile[];
    labPartners: StaffLabPartnerProfile[];
    doctors: DoctorOption[];
    memberCount: number;
  },
): StaffGlobalKpi[] {
  const s = analytics?.summary;

  if (s) {
    const base: StaffGlobalKpi[] = [
      { label: 'Total samples', value: s.total_samples },
      { label: 'Collected', value: s.collected },
      { label: 'In lab pipeline', value: s.in_lab_pipeline },
      { label: 'Reports published', value: s.reports_published },
    ];

    if (roleKey === 'technician') {
      return [...base, { label: 'Active technicians', value: context.technicians.length }];
    }
    if (roleKey === 'lab_partner') {
      return [
        { label: 'Samples in pipeline', value: s.in_lab_pipeline },
        { label: 'Published reports', value: s.reports_published },
        { label: 'Rejected', value: s.rejected },
        { label: 'Lab partners', value: context.labPartners.length },
      ];
    }
    if (roleKey === 'doctor') {
      return [
        ...base,
        { label: 'Active doctors', value: context.doctors.length },
        {
          label: 'With clinic',
          value: context.doctors.filter((d) => d.clinicName).length,
        },
      ];
    }
    if (roleKey === 'operations' || roleKey === 'super_admin') {
      return [
        ...base,
        { label: 'Technicians', value: context.technicians.length },
        { label: 'Doctors', value: context.doctors.length },
        { label: 'Ops team', value: context.memberCount },
      ];
    }
    return base;
  }

  if (roleKey === 'doctor') {
    return [
      { label: 'Active doctors', value: context.doctors.length },
      { label: 'With clinic', value: context.doctors.filter((d) => d.clinicName).length },
      {
        label: 'Specializations',
        value: new Set(context.doctors.map((d) => d.specialization).filter(Boolean)).size,
      },
    ];
  }

  return [{ label: 'Team members', value: context.memberCount }];
}
