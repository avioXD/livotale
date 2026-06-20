import { AppRole } from '@/types';
import type { StaffRoleConfig, StaffRoleKey } from '@/types/staffHub';
import { orgPath } from '@/app/config/orgRoutes';

export const STAFF_ROLE_SLUGS: Record<StaffRoleKey, string> = {
  technician: 'technicians',
  doctor: 'doctors',
  lab_partner: 'lab-partners',
  dietician: 'dieticians',
  health_coach: 'health-coaches',
  pharmacy: 'pharmacy',
  operations: 'operations',
  super_admin: 'super-admins',
  city_manager: 'operations',
};

export function staffRolePath(key: StaffRoleKey): string {
  const slug = key === 'city_manager' ? 'operations' : STAFF_ROLE_SLUGS[key];
  return orgPath(`/admin/staff/${slug}`);
}

/** Staff types managed in the liver fibrosis scan clinic UI. */
export const STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  {
    key: 'technician',
    label: 'Technicians',
    description: 'Home visits — FibroScan capture and sample dispatch. Scoped by city and service pincodes.',
    appRole: AppRole.TECHNICIAN,
  },
  {
    key: 'doctor',
    label: 'Doctors',
    description: 'Consultations, scan review, and prescriptions. City-scoped where assigned.',
    appRole: AppRole.DOCTOR,
  },
  {
    key: 'lab_partner',
    label: 'Lab partners',
    description: 'Pathology lab profiles, legal documents, report volume, and billing.',
    appRole: AppRole.LAB_PARTNER,
  },
  {
    key: 'operations',
    label: 'Operations team',
    description:
      'Booking, patient registration, and field coordination. Ops staff can be promoted to city manager for city-wide control.',
    appRole: AppRole.OPERATIONS,
  },
  {
    key: 'super_admin',
    label: 'Super admins',
    description: 'Platform administrators — full org access across all cities.',
    appRole: AppRole.SUPER_ADMIN,
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
  {
    key: 'city_manager',
    label: 'City managers',
    description: 'Legacy hub key — city managers are operations staff with promotion flag.',
    appRole: AppRole.CITY_MANAGER,
  },
];

export const ALL_STAFF_ROLE_CONFIGS: StaffRoleConfig[] = [
  ...STAFF_ROLE_CONFIGS,
  ...LEGACY_STAFF_ROLE_CONFIGS,
];

const ACTIVE_STAFF_KEYS = new Set(STAFF_ROLE_CONFIGS.map((c) => c.key));

/** Staff hubs restricted to platform admins (Super Admin / City Manager app role). */
export const PLATFORM_ADMIN_STAFF_KEYS = new Set<StaffRoleKey>(['operations', 'super_admin']);

export function staffRoleFromSlug(slug: string | undefined): StaffRoleKey | null {
  if (slug === 'city-managers') return 'operations';
  const entry = Object.entries(STAFF_ROLE_SLUGS).find(([, s]) => s === slug);
  const key = entry?.[0] as StaffRoleKey | undefined;
  if (!key || !ACTIVE_STAFF_KEYS.has(key)) return null;
  return key;
}

export const STAFF_SECTION_TABS = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'users' as const, label: 'Users' },
];
