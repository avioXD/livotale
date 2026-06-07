import type { StaffMemberRow, StaffRoleDashboard, StaffRoleKey } from '@/types/staffHub';

const DEMO_MEMBERS: Record<Exclude<StaffRoleKey, 'technician' | 'doctor' | 'lab_partner'>, StaffMemberRow[]> = {
  dietician: [
    {
      id: 'demo-diet-1',
      fullName: 'Anita Desai',
      subtitle: 'Clinical nutrition · RD-1024',
      status: 'active',
      email: 'anita.desai@livotel.demo',
      mobile: '+91 98100 11223',
      metrics: [
        { label: 'Active patients', value: 42 },
        { label: 'Plans this month', value: 18 },
        { label: 'Avg rating', value: '4.7' },
      ],
    },
  ],
  health_coach: [
    {
      id: 'demo-coach-1',
      fullName: 'Vikram Joshi',
      subtitle: 'Liver wellness coach · HC-0088',
      status: 'active',
      email: 'vikram.joshi@livotel.demo',
      mobile: '+91 98200 33445',
      metrics: [
        { label: 'Active journeys', value: 31 },
        { label: 'Sessions / week', value: 24 },
        { label: 'Completion rate', value: '86%' },
      ],
    },
  ],
  pharmacy: [
    {
      id: 'demo-pharm-1',
      fullName: 'MedPlus Bandra Hub',
      subtitle: 'DL-MH-2019-4412',
      status: 'active',
      email: 'hub.bandra@medplus.demo',
      mobile: '+91 22 2640 0000',
      metrics: [
        { label: 'Orders today', value: 12 },
        { label: 'Delivered', value: 9 },
        { label: 'Pending', value: 3 },
      ],
    },
  ],
  operations: [
    {
      id: 'demo-ops-1',
      fullName: 'Sneha Kapoor',
      subtitle: 'City operations lead',
      status: 'active',
      email: 'sneha.kapoor@livotel.demo',
      mobile: '+91 98900 55667',
      metrics: [
        { label: 'Pending assigns', value: 5 },
        { label: 'Routes monitored', value: 18 },
        { label: 'Escalations', value: 2 },
      ],
    },
  ],
};

const DEMO_DASHBOARDS: Partial<Record<StaffRoleKey, StaffRoleDashboard>> = {
  dietician: {
    headline: 'Nutrition program overview',
    kpis: [
      { label: 'Active dieticians', value: 1 },
      { label: 'Plans issued (30d)', value: 18 },
      { label: 'Patient adherence', value: '72%' },
    ],
  },
  health_coach: {
    headline: 'Coaching program overview',
    kpis: [
      { label: 'Active coaches', value: 1 },
      { label: 'Journeys in progress', value: 31 },
      { label: 'Avg session score', value: '4.6' },
    ],
  },
  pharmacy: {
    headline: 'Pharmacy fulfilment overview',
    kpis: [
      { label: 'Hubs active', value: 1 },
      { label: 'Orders (7d)', value: 84 },
      { label: 'On-time delivery', value: '91%' },
    ],
  },
  operations: {
    headline: 'Operations team overview',
    kpis: [
      { label: 'Ops staff', value: 1 },
      { label: 'Open assignments', value: 5 },
      { label: 'SLA breaches', value: 1 },
    ],
  },
  doctor: {
    headline: 'Clinical staff overview',
    kpis: [
      { label: 'Active doctors', value: '—' },
      { label: 'Consultations (30d)', value: '—' },
      { label: 'Avg wait time', value: '—' },
    ],
  },
};

export function getDemoStaffMembers(role: StaffRoleKey): StaffMemberRow[] {
  if (role === 'technician' || role === 'doctor' || role === 'lab_partner') return [];
  return DEMO_MEMBERS[role] ?? [];
}

export function getDemoStaffDashboard(role: StaffRoleKey): StaffRoleDashboard | null {
  return DEMO_DASHBOARDS[role] ?? null;
}
