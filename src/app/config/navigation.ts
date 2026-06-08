import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiCreditCard,
  FiHome,
  FiSettings,
  FiShield,
  FiTruck,
  FiUsers,
  FiHeart,
} from 'react-icons/fi';
import { MdOutlineHealthAndSafety, MdOutlineScience } from 'react-icons/md';
import { ADMIN_ROLES, OPS_ROLES } from '@/app/config/productRoles';
import { AppRole, type NavGroup, type NavGroupId, type NavItem } from '@/types';

const STAFF_ROLES = [
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
] as const;

const ALL_PRODUCT_ROLES = [AppRole.PATIENT, ...STAFF_ROLES] as const;

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  overview: 'Overview',
  'patient-care': 'My Care',
  'technician-ops': 'Field work',
  'lab-ops': 'Partner lab',
  clinical: 'Clinical',
  fulfillment: 'Fulfillment',
  'admin-ops': 'Day-to-day ops',
  'staff-management': 'People & partners',
  account: 'Settings',
};

const GROUP_ORDER: NavGroupId[] = [
  'overview',
  'patient-care',
  'technician-ops',
  'clinical',
  'admin-ops',
  'staff-management',
  'account',
];

export const navigationItems: NavItem[] = [
  // ── Patient ──
  {
    id: 'patient-journey',
    label: 'Patient Journey',
    path: '/patient-journey',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.PATIENT],
    group: 'overview',
  },
  {
    id: 'patient-notifications',
    label: 'Notifications',
    path: '/patient/notifications',
    icon: FiBell,
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

  // ── All staff: overview ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: FiHome,
    roles: [...STAFF_ROLES],
    group: 'overview',
  },
  {
    id: 'staff-notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: FiBell,
    roles: [...STAFF_ROLES],
    group: 'overview',
  },

  // ── Admin-only overview ──
  {
    id: 'admin-packages',
    label: 'Packages',
    path: '/admin/packages',
    icon: FiCreditCard,
    roles: [...ADMIN_ROLES],
    group: 'overview',
  },
  {
    id: 'admin-audit',
    label: 'Audit log',
    path: '/admin/audit',
    icon: FiShield,
    roles: [...ADMIN_ROLES],
    group: 'overview',
  },
  {
    id: 'patients-registry',
    label: 'Patients',
    path: '/patients',
    icon: FiUsers,
    roles: [AppRole.DOCTOR, ...OPS_ROLES],
    group: 'overview',
  },

  // ── Technician ──
  {
    id: 'technician-workspace',
    label: 'Field work',
    path: '/technician/orders',
    icon: FiActivity,
    roles: [AppRole.TECHNICIAN],
    group: 'technician-ops',
    childrenOnly: true,
    children: [
      { id: 'tech-orders', label: 'Liver Fibrosis Scan', path: '/technician/orders', icon: FiActivity },
      { id: 'tech-schedule', label: 'Sample collection', path: '/technician/schedule', icon: MdOutlineScience },
    ],
  },

  // ── Doctor ──
  {
    id: 'doctor-workspace',
    label: 'Clinical',
    path: '/doctor/consultations',
    icon: FiActivity,
    roles: [AppRole.DOCTOR],
    group: 'clinical',
    childrenOnly: true,
    children: [
      { id: 'doc-consultations', label: 'Liver care Rx', path: '/doctor/consultations', icon: FiActivity },
      { id: 'doc-appointments', label: 'Appointments', path: '/doctor/appointments', icon: FiCalendar },
      { id: 'doc-patients', label: 'Patients', path: '/patients', icon: FiUsers },
    ],
  },

  // ── Operations hub (Operations + Admin) ──
  {
    id: 'admin-operations',
    label: 'Day-to-day ops',
    path: '/admin/operations',
    icon: FiShield,
    roles: [...OPS_ROLES],
    group: 'admin-ops',
    childrenOnly: true,
    children: [
      { id: 'ops-overview', label: 'Overview', path: '/admin/operations', icon: FiHome },
      { id: 'ops-enquiries', label: 'Enquiries', path: '/admin/operations?tab=enquiries', icon: FiClipboard },
      { id: 'ops-orders', label: 'Orders & payments', path: '/admin/operations?tab=orders', icon: FiCreditCard },
      { id: 'ops-partner-lab', label: 'Lab reports', path: '/admin/operations?tab=partner-lab', icon: MdOutlineScience },
      { id: 'ops-appointments', label: 'Appointments', path: '/admin/operations?tab=appointments', icon: FiCalendar },
      { id: 'ops-ai-review', label: 'AI review', path: '/admin/operations?tab=ai-review', icon: FiActivity },
    ],
  },
  {
    id: 'admin-notifications',
    label: 'Channel notification log',
    path: '/admin/notifications',
    icon: FiClipboard,
    roles: [...OPS_ROLES],
    group: 'admin-ops',
  },

  // ── People & partners ──
  {
    id: 'admin-staff-technicians',
    label: 'Technicians',
    path: '/admin/staff/technicians',
    icon: FiUsers,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-doctors',
    label: 'Doctors',
    path: '/admin/staff/doctors',
    icon: FiActivity,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-partner-labs',
    label: 'Partner lab profiles',
    path: '/admin/lab-partners',
    icon: MdOutlineScience,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-lab-partners',
    label: 'Lab partner users',
    path: '/admin/staff/lab-partners',
    icon: MdOutlineScience,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-operations',
    label: 'Operations team',
    path: '/admin/staff/operations',
    icon: FiShield,
    roles: [...ADMIN_ROLES],
    group: 'staff-management',
  },

  // ── Settings ──
  {
    id: 'admin-integrations',
    label: 'Integrations',
    path: '/admin/integrations',
    icon: FiSettings,
    roles: [...ADMIN_ROLES],
    group: 'account',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: FiSettings,
    roles: [...ALL_PRODUCT_ROLES, AppRole.DIETICIAN, AppRole.HEALTH_COACH, AppRole.PHARMACY, AppRole.LAB_PARTNER],
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

export function getDefaultHomePath(role: AppRole | null): string {
  switch (role) {
    case AppRole.TECHNICIAN:
    case AppRole.DOCTOR:
    case AppRole.OPERATIONS:
    case AppRole.CITY_MANAGER:
    case AppRole.SUPER_ADMIN:
      return '/dashboard';
    case AppRole.PATIENT:
      return '/patient-journey';
    case AppRole.DIETICIAN:
    case AppRole.HEALTH_COACH:
    case AppRole.PHARMACY:
    case AppRole.LAB_PARTNER:
      return '/settings';
    default:
      return '/settings';
  }
}

/** @deprecated use STAFF_ROLES — kept for imports that expect PRODUCT_STAFF */
export const PRODUCT_STAFF_ROLES = STAFF_ROLES;
