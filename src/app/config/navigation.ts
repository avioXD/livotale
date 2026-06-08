import {
  FiActivity,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiCreditCard,
  FiHome,
  FiSettings,
  FiShield,
  FiTruck,
  FiUsers,
  FiFileText,
  FiHeart,
} from 'react-icons/fi';
import { MdOutlineHealthAndSafety, MdOutlineScience } from 'react-icons/md';
import { AppRole, type NavGroup, type NavGroupId, type NavItem } from '@/types';

const STAFF_ROLES = [
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.PHARMACY,
  AppRole.LAB_PARTNER,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
] as const;

const ALL_ROLES = [AppRole.PATIENT, ...STAFF_ROLES] as const;

const ADMIN_OPS_ROLES = [AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN] as const;

const CARE_TEAM_ROLES = [AppRole.DIETICIAN, AppRole.HEALTH_COACH] as const;

const CLINICAL_OVERSIGHT_ROLES = [AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN] as const;

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  overview: 'Overview',
  'patient-care': 'My Care',
  'technician-ops': 'Field Operations',
  'lab-ops': 'Lab Operations',
  clinical: 'Clinical',
  fulfillment: 'Fulfillment',
  'admin-ops': 'Operations',
  'staff-management': 'People & Staff',
  account: 'Settings',
};

/** Order of sidebar sections per role context. */
const GROUP_ORDER: NavGroupId[] = [
  'overview',
  'patient-care',
  'technician-ops',
  'lab-ops',
  'clinical',
  'fulfillment',
  'admin-ops',
  'staff-management',
  'account',
];

export const navigationItems: NavItem[] = [
  // ── Patient overview ──
  {
    id: 'patient-journey',
    label: 'Patient Journey',
    path: '/patient-journey',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.PATIENT],
    group: 'overview',
  },
  {
    id: 'my-appointments',
    label: 'My Appointments',
    path: '/appointments',
    icon: FiCalendar,
    roles: [AppRole.PATIENT],
    group: 'overview',
  },

  // ── Staff overview (role-specific) ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: FiHome,
    roles: [
      AppRole.DOCTOR,
      AppRole.TECHNICIAN,
      AppRole.DIETICIAN,
      AppRole.HEALTH_COACH,
      AppRole.PHARMACY,
      AppRole.LAB_PARTNER,
      ...ADMIN_OPS_ROLES,
    ],
    group: 'overview',
  },
  {
    id: 'patients-registry',
    label: 'Patients',
    path: '/patients',
    icon: FiUsers,
    roles: [AppRole.PHARMACY, ...ADMIN_OPS_ROLES],
    group: 'overview',
  },
  {
    id: 'Liver Fibrosis Scan-oversight',
    label: 'Liver Fibrosis Scan',
    path: '/Liver Fibrosis Scan',
    icon: FiActivity,
    roles: [...CLINICAL_OVERSIGHT_ROLES],
    group: 'overview',
  },
  {
    id: 'clinical-reports-oversight',
    label: 'Clinical reports',
    path: '/reports',
    icon: FiFileText,
    roles: [...CLINICAL_OVERSIGHT_ROLES],
    group: 'overview',
  },

  // ── Patient care (consumer) ──
  {
    id: 'patient-reports',
    label: 'Reports',
    path: '/reports',
    icon: FiFileText,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-treatment-plans',
    label: 'Treatment Plans',
    path: '/treatment-plans',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-prescriptions',
    label: 'Prescriptions',
    path: '/prescriptions',
    icon: FiClipboard,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-coaching',
    label: 'Health Coaching',
    path: '/coaching',
    icon: FiHeart,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-delivery',
    label: 'Home Delivery',
    path: '/delivery',
    icon: FiTruck,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },

  // ── Technician field ops ──
  {
    id: 'technician-workspace',
    label: 'Field operations',
    path: '/technician/schedule',
    icon: FiCalendar,
    roles: [AppRole.TECHNICIAN],
    group: 'technician-ops',
    childrenOnly: true,
    children: [
      { id: 'tech-schedule', label: 'Sample collection', path: '/technician/schedule', icon: MdOutlineScience },
    ],
  },

  // ── Lab ops ──
  {
    id: 'lab-workspace',
    label: 'Lab',
    path: '/lab/dashboard',
    icon: MdOutlineScience,
    roles: [AppRole.LAB_PARTNER],
    group: 'lab-ops',
    childrenOnly: true,
    children: [
      { id: 'lab-overview', label: 'Dashboard', path: '/lab/dashboard', icon: FiHome },
      { id: 'lab-queue', label: 'Testing queue', path: '/lab-samples', icon: MdOutlineScience },
      { id: 'lab-reports-child', label: 'Reports & results', path: '/reports', icon: FiFileText },
    ],
  },

  // ── Doctor clinical workspace ──
  {
    id: 'doctor-workspace',
    label: 'Clinical',
    path: '/doctor/appointments',
    icon: FiActivity,
    roles: [AppRole.DOCTOR],
    group: 'clinical',
    childrenOnly: true,
    children: [
      { id: 'doc-appointments', label: 'Appointments', path: '/doctor/appointments', icon: FiCalendar },
      { id: 'doc-patients', label: 'Patients', path: '/patients', icon: FiUsers },
      { id: 'doc-availability', label: 'Availability', path: '/doctor/appointments?section=availability', icon: FiClock },
      { id: 'doc-leave', label: 'Leave requests', path: '/doctor/appointments?section=leave', icon: FiFileText },
    ],
  },

  // ── Allied health care coordination ──
  {
    id: 'care-workspace',
    label: 'Care coordination',
    path: '/appointments',
    icon: MdOutlineHealthAndSafety,
    roles: [...CARE_TEAM_ROLES],
    group: 'clinical',
    childrenOnly: true,
    children: [
      { id: 'care-appointments', label: 'Appointments', path: '/appointments', icon: FiCalendar },
      { id: 'care-patients', label: 'Patients', path: '/patients', icon: FiUsers },
      {
        id: 'care-plans',
        label: 'Treatment plans',
        path: '/treatment-plans',
        icon: MdOutlineHealthAndSafety,
        roles: [AppRole.DIETICIAN],
      },
      {
        id: 'care-sessions',
        label: 'Care sessions',
        path: '/coaching',
        icon: FiHeart,
        roles: [AppRole.HEALTH_COACH, AppRole.DIETICIAN],
      },
    ],
  },

  // ── Pharmacy fulfillment ──
  {
    id: 'pharmacy-workspace',
    label: 'Fulfillment',
    path: '/prescriptions',
    icon: FiTruck,
    roles: [AppRole.PHARMACY],
    group: 'fulfillment',
    childrenOnly: true,
    children: [
      { id: 'pharmacy-rx', label: 'Prescriptions', path: '/prescriptions', icon: FiClipboard },
      { id: 'pharmacy-delivery', label: 'Home delivery', path: '/delivery', icon: FiTruck },
    ],
  },

  // ── Admin operations ──
  {
    id: 'admin-operations',
    label: 'Operations',
    path: '/admin/operations',
    icon: FiShield,
    roles: [...ADMIN_OPS_ROLES],
    group: 'admin-ops',
    childrenOnly: true,
    children: [
      { id: 'ops-overview', label: 'Overview', path: '/admin/operations', icon: FiHome },
      { id: 'ops-appointments', label: 'Appointments', path: '/admin/operations?tab=appointments', icon: FiCalendar },
      { id: 'ops-samples', label: 'Sample collections', path: '/admin/operations?tab=samples', icon: MdOutlineScience },
      { id: 'ops-orders', label: 'Orders & payments', path: '/admin/operations?tab=orders', icon: FiCreditCard },
    ],
  },
  {
    id: 'admin-staff-technicians',
    label: 'Technicians',
    path: '/admin/staff/technicians',
    icon: FiUsers,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-doctors',
    label: 'Doctors',
    path: '/admin/staff/doctors',
    icon: FiActivity,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-lab-partners',
    label: 'Lab partners',
    path: '/admin/staff/lab-partners',
    icon: MdOutlineScience,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-dieticians',
    label: 'Dieticians',
    path: '/admin/staff/dieticians',
    icon: MdOutlineHealthAndSafety,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-health-coaches',
    label: 'Health coaches',
    path: '/admin/staff/health-coaches',
    icon: FiHeart,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-pharmacy',
    label: 'Pharmacy',
    path: '/admin/staff/pharmacy',
    icon: FiTruck,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-operations',
    label: 'Operations',
    path: '/admin/staff/operations',
    icon: FiShield,
    roles: [...ADMIN_OPS_ROLES],
    group: 'staff-management',
  },

  // ── Settings ──
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: FiSettings,
    roles: [...ALL_ROLES],
    group: 'account',
  },
];

export function getNavItemsForRole(role: AppRole | null): NavItem[] {
  if (!role) return [];
  return navigationItems
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) => !child.roles || child.roles.includes(role),
      ),
    }));
}

export function getNavGroupsForRole(role: AppRole | null): NavGroup[] {
  const items = getNavItemsForRole(role);
  const byGroup = new Map<NavGroupId, NavItem[]>();

  for (const item of items) {
    const groupId = item.group ?? 'overview';
    const list = byGroup.get(groupId) ?? [];
    list.push(item);
    byGroup.set(groupId, list);
  }

  return GROUP_ORDER.filter((id) => byGroup.has(id)).map((id) => ({
    id,
    label: NAV_GROUP_LABELS[id],
    items: byGroup.get(id)!,
  }));
}

export const OPEN_ROUTES = ['/login', '/register', '/reset-password'] as const;

export function isOpenRoute(pathname: string): boolean {
  return OPEN_ROUTES.some((route) => pathname.startsWith(route));
}

/** Default landing path after login per role. */
export function getDefaultHomePath(role: AppRole | null): string {
  switch (role) {
    case AppRole.TECHNICIAN:
      return '/technician/schedule';
    case AppRole.LAB_PARTNER:
      return '/lab/dashboard';
    case AppRole.OPERATIONS:
    case AppRole.CITY_MANAGER:
    case AppRole.SUPER_ADMIN:
      return '/admin/operations';
    case AppRole.DOCTOR:
      return '/dashboard';
    case AppRole.PATIENT:
      return '/patient-journey';
    default:
      return '/dashboard';
  }
}
