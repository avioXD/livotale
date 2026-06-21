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
import { orgPath, ORG_LOGIN_PATH, ORG_REGISTER_PATH, ORG_RESET_PASSWORD_PATH } from '@/app/config/orgRoutes';
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
  'lab-ops': 'Lab partner',
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
    path: orgPath('/appointments'),
    icon: FiCalendar,
    roles: [AppRole.PATIENT],
    group: 'overview',
  },
  {
    id: 'patient-treatment-plans',
    label: 'Treatment Plans',
    path: orgPath('/treatment-plans'),
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-prescriptions',
    label: 'Prescriptions',
    path: orgPath('/prescriptions'),
    icon: FiClipboard,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-coaching',
    label: 'Health Coaching',
    path: orgPath('/coaching'),
    icon: FiHeart,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },
  {
    id: 'patient-delivery',
    label: 'Home Delivery',
    path: orgPath('/delivery'),
    icon: FiTruck,
    roles: [AppRole.PATIENT],
    group: 'patient-care',
  },

  // ── All staff: overview ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: orgPath('/dashboard'),
    icon: FiHome,
    roles: [...STAFF_ROLES],
    group: 'overview',
  },
  {
    id: 'staff-notifications',
    label: 'Notifications',
    path: orgPath('/notifications'),
    icon: FiBell,
    roles: [...STAFF_ROLES],
    group: 'overview',
  },

  // ── Admin-only overview ──
  {
    id: 'admin-packages',
    label: 'Packages',
    path: orgPath('/admin/packages'),
    icon: FiCreditCard,
    roles: [...ADMIN_ROLES],
    group: 'overview',
  },
  {
    id: 'admin-audit',
    label: 'Audit log',
    path: orgPath('/admin/audit'),
    icon: FiShield,
    roles: [...ADMIN_ROLES],
    group: 'overview',
  },
  {
    id: 'admin-login-logs',
    label: 'Login activity',
    path: orgPath('/admin/login-logs'),
    icon: FiActivity,
    roles: [...ADMIN_ROLES],
    group: 'overview',
  },
  {
    id: 'patients-registry',
    label: 'Patients',
    path: orgPath('/patients'),
    icon: FiUsers,
    roles: [...OPS_ROLES, AppRole.DOCTOR],
    group: 'overview',
  },

  // ── Doctor ──
  {
    id: 'doc-my-patients',
    label: 'My patients',
    path: orgPath('/doctor/patients'),
    icon: FiUsers,
    roles: [AppRole.DOCTOR],
    group: 'clinical',
  },
  {
    id: 'doc-consultations',
    label: 'Consultations',
    path: orgPath('/doctor/consultations'),
    icon: FiActivity,
    roles: [AppRole.DOCTOR],
    group: 'clinical',
  },

  // ── Technician — FibroScan field visits only ──
  {
    id: 'technician-orders',
    label: 'Field orders',
    path: orgPath('/technician/orders'),
    icon: FiActivity,
    roles: [AppRole.TECHNICIAN],
    group: 'technician-ops',
  },

  // ── Operations hub (Operations + Admin) ──
  {
    id: 'admin-operations',
    label: 'Day-to-day ops',
    path: orgPath('/admin/operations'),
    icon: FiShield,
    roles: [...OPS_ROLES],
    group: 'admin-ops',
    childrenOnly: true,
    children: [
      { id: 'ops-overview', label: 'Overview', path: orgPath('/admin/operations'), icon: FiHome },
      { id: 'ops-enquiries', label: 'Enquiries', path: orgPath('/admin/operations?tab=enquiries'), icon: FiClipboard },
      { id: 'ops-orders', label: 'Orders', path: orgPath('/admin/operations?tab=orders'), icon: FiCreditCard },
      { id: 'ops-partner-lab', label: 'Lab reports', path: orgPath('/admin/operations?tab=partner-lab'), icon: MdOutlineScience },
      { id: 'ops-appointments', label: 'Appointments', path: orgPath('/admin/operations?tab=appointments'), icon: FiCalendar },
      { id: 'ops-ai-review', label: 'AI review', path: orgPath('/admin/operations?tab=ai-review'), icon: FiActivity },
    ],
  },
  {
    id: 'admin-notifications',
    label: 'Channel notification log',
    path: orgPath('/admin/notifications'),
    icon: FiClipboard,
    roles: [...OPS_ROLES],
    group: 'admin-ops',
  },

  // ── People & partners ──
  {
    id: 'admin-bank-details',
    label: 'Bank details',
    path: orgPath('/admin/bank-details'),
    icon: FiCreditCard,
    roles: [AppRole.SUPER_ADMIN],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-technicians',
    label: 'Technicians',
    path: orgPath('/admin/staff/technicians'),
    icon: FiUsers,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-doctors',
    label: 'Doctors',
    path: orgPath('/admin/staff/doctors'),
    icon: FiActivity,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-lab-partners',
    label: 'Lab partners',
    path: orgPath('/admin/staff/lab-partners'),
    icon: MdOutlineScience,
    roles: [...OPS_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-operations',
    label: 'Operations team',
    path: orgPath('/admin/staff/operations'),
    icon: FiShield,
    roles: [...ADMIN_ROLES],
    group: 'staff-management',
  },
  {
    id: 'admin-staff-super-admins',
    label: 'Super admins',
    path: orgPath('/admin/staff/super-admins'),
    icon: FiShield,
    roles: [...ADMIN_ROLES],
    group: 'staff-management',
  },

  // ── Settings ──
  {
    id: 'admin-organization-configuration',
    label: 'Organization',
    path: orgPath('/admin/organization-configuration'),
    icon: FiSettings,
    roles: [...ADMIN_ROLES],
    group: 'account',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: orgPath('/settings'),
    icon: FiSettings,
    roles: [...ALL_PRODUCT_ROLES, AppRole.DIETICIAN, AppRole.HEALTH_COACH, AppRole.PHARMACY, AppRole.LAB_PARTNER],
    group: 'account',
    childrenOnly: true,
    children: [
      { id: 'settings-profile', label: 'Account', path: orgPath('/settings'), icon: FiSettings },
      {
        id: 'doc-availability',
        label: 'Availability',
        path: orgPath('/settings?tab=availability'),
        icon: FiCalendar,
        roles: [AppRole.DOCTOR],
      },
      {
        id: 'doc-leave',
        label: 'Leave',
        path: orgPath('/settings?tab=leave'),
        icon: FiCalendar,
        roles: [AppRole.DOCTOR],
      },
    ],
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

export const OPEN_ROUTES = [ORG_LOGIN_PATH, ORG_REGISTER_PATH, ORG_RESET_PASSWORD_PATH] as const;

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
      return orgPath('/dashboard');
    case AppRole.PATIENT:
      return '/patient-journey';
    case AppRole.DIETICIAN:
    case AppRole.HEALTH_COACH:
    case AppRole.PHARMACY:
    case AppRole.LAB_PARTNER:
      return orgPath('/settings');
    default:
      return orgPath('/settings');
  }
}

/** @deprecated use STAFF_ROLES — kept for imports that expect PRODUCT_STAFF */
export const PRODUCT_STAFF_ROLES = STAFF_ROLES;
