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

/** Staff types managed in the liver fibrosis scan clinic UI. */
export const STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  {
    key: 'technician',
    label: 'Technicians',
    description: 'Center and home visits — Liver Fibrosis Scan capture and sample collection.',
    appRole: AppRole.TECHNICIAN,
  },
  {
    key: 'doctor',
    label: 'Doctors',
    description: 'Consultations (clinic & tele), Liver Fibrosis Scan review, prescriptions.',
    appRole: AppRole.DOCTOR,
  },
  {
    key: 'lab_partner',
    label: 'Lab partners',
    description: 'Third-party labs — linked orders; Operations uploads report PDFs.',
    appRole: AppRole.LAB_PARTNER,
  },
  {
    key: 'operations',
    label: 'Operations team',
    description: 'Booking, patient registration, technician and doctor assignment.',
    appRole: AppRole.OPERATIONS,
  },
];

/** Legacy staff types — API may still return users; hidden from staff hub navigation. */
export const LEGACY_STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  {
    key: 'dietician',
    label: 'Dieticians',
    description: 'Legacy role — not used in liver fibrosis scan product UI.',
    appRole: AppRole.DIETICIAN,
  },
  {
    key: 'health_coach',
    label: 'Health coaches',
    description: 'Legacy role — not used in liver fibrosis scan product UI.',
    appRole: AppRole.HEALTH_COACH,
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    description: 'Legacy role — not used in liver fibrosis scan product UI.',
    appRole: AppRole.PHARMACY,
  },
];

export const ALL_STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  ...STAFF_ROLE_CONFIGS,
  ...LEGACY_STAFF_ROLE_CONFIGS,
];

const ACTIVE_STAFF_KEYS = new Set(STAFF_ROLE_CONFIGS.map((c) => c.key));

export function staffRoleFromSlug(slug: string | undefined): StaffRoleKey | null {
  const entry = Object.entries(STAFF_ROLE_SLUGS).find(([, s]) => s === slug);
  const key = entry?.[0] as StaffRoleKey | undefined;
  if (!key || !ACTIVE_STAFF_KEYS.has(key)) return null;
  return key;
}

export const STAFF_SECTION_TABS = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'users' as const, label: 'Users' },
];
