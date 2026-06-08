import { AppRole } from '@/types';
import type { StaffRoleConfig, StaffRoleKey } from '@/types/staffHub';

export const STAFF_ROLE_SLUGS: Record<StaffRoleKey, string> = {
  technician: 'technicians',
  doctor: 'doctors',
  lab_partner: 'lab-partners',
  dietician: 'dieticians',
  health_coach: 'health-coaches',
  pharmacy: 'pharmacy',
  operations: 'operations',
};

export function staffRolePath(key: StaffRoleKey): string {
  return `/admin/staff/${STAFF_ROLE_SLUGS[key]}`;
}

export function staffRoleFromSlug(slug: string | undefined): StaffRoleKey {
  const entry = Object.entries(STAFF_ROLE_SLUGS).find(([, s]) => s === slug);
  return (entry?.[0] as StaffRoleKey | undefined) ?? 'technician';
}

export const STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  {
    key: 'technician',
    label: 'Technicians',
    description: 'Field collectors — sample collection, home visits, route coverage.',
    appRole: AppRole.TECHNICIAN,
  },
  {
    key: 'doctor',
    label: 'Doctors',
    description: 'Clinical staff — consultations, Liver Fibrosis Scan review, prescriptions.',
    appRole: AppRole.DOCTOR,
  },
  {
    key: 'lab_partner',
    label: 'Lab partners',
    description: 'Partner labs — sample receipt, testing, and report publishing.',
    appRole: AppRole.LAB_PARTNER,
  },
  {
    key: 'dietician',
    label: 'Dieticians',
    description: 'Nutrition care team — diet plans and patient coaching.',
    appRole: AppRole.DIETICIAN,
  },
  {
    key: 'health_coach',
    label: 'Health coaches',
    description: 'Lifestyle coaching and care journey support.',
    appRole: AppRole.HEALTH_COACH,
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    description: 'Medication fulfilment and home delivery coordination.',
    appRole: AppRole.PHARMACY,
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Internal ops and city managers — scheduling and oversight.',
    appRole: AppRole.OPERATIONS,
  },
];

export const STAFF_SECTION_TABS = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'users' as const, label: 'Users' },
];
