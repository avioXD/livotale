import {
  FiActivity,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiSettings,
  FiShield,
  FiTruck,
  FiUsers,
  FiFileText,
  FiHeart,
} from 'react-icons/fi';
import { MdOutlineHealthAndSafety, MdOutlineScience } from 'react-icons/md';
import { AppRole, type NavItem } from '@/types';

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

export const navigationItems: NavItem[] = [
  {
    id: 'patient-journey',
    label: 'Patient Journey',
    path: '/patient-journey',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.PATIENT],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: FiHome,
    roles: [...ALL_ROLES],
  },
  {
    id: 'patients',
    label: 'Patients',
    path: '/patients',
    icon: FiUsers,
    roles: [
      AppRole.DOCTOR,
      AppRole.TECHNICIAN,
      AppRole.DIETICIAN,
      AppRole.HEALTH_COACH,
      AppRole.OPERATIONS,
      AppRole.CITY_MANAGER,
      AppRole.SUPER_ADMIN,
    ],
  },
  {
    id: 'doctor-calendar',
    label: 'My Calendar',
    path: '/doctor/appointments',
    icon: FiCalendar,
    roles: [AppRole.DOCTOR],
  },
  {
    id: 'technician-schedule',
    label: 'Field Schedule',
    path: '/technician/schedule',
    icon: FiCalendar,
    roles: [AppRole.TECHNICIAN],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: FiCalendar,
    roles: [
      AppRole.PATIENT,
      AppRole.HEALTH_COACH,
      AppRole.DIETICIAN,
      AppRole.OPERATIONS,
      AppRole.CITY_MANAGER,
      AppRole.SUPER_ADMIN,
    ],
  },
  {
    id: 'fibroscan',
    label: 'FibroScan',
    path: '/fibroscan',
    icon: FiActivity,
    roles: [AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.SUPER_ADMIN, AppRole.CITY_MANAGER],
  },
  {
    id: 'reports',
    label: 'Clinical Reports',
    path: '/reports',
    icon: FiFileText,
    roles: [
      AppRole.PATIENT,
      AppRole.DOCTOR,
      AppRole.LAB_PARTNER,
      AppRole.SUPER_ADMIN,
      AppRole.CITY_MANAGER,
    ],
  },
  {
    id: 'treatment-plans',
    label: 'Treatment Plans',
    path: '/treatment-plans',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.DOCTOR, AppRole.PATIENT, AppRole.DIETICIAN, AppRole.SUPER_ADMIN],
  },
  {
    id: 'lab-samples',
    label: 'Lab Samples',
    path: '/lab-samples',
    icon: MdOutlineScience,
    roles: [AppRole.TECHNICIAN, AppRole.LAB_PARTNER, AppRole.DOCTOR, AppRole.SUPER_ADMIN],
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    path: '/prescriptions',
    icon: FiClipboard,
    roles: [AppRole.DOCTOR, AppRole.PATIENT, AppRole.PHARMACY, AppRole.SUPER_ADMIN],
  },
  {
    id: 'delivery',
    label: 'Home Delivery',
    path: '/delivery',
    icon: FiTruck,
    roles: [AppRole.PATIENT, AppRole.PHARMACY, AppRole.SUPER_ADMIN, AppRole.OPERATIONS],
  },
  {
    id: 'coaching',
    label: 'Health Coaching',
    path: '/coaching',
    icon: FiHeart,
    roles: [
      AppRole.PATIENT,
      AppRole.HEALTH_COACH,
      AppRole.DIETICIAN,
      AppRole.DOCTOR,
      AppRole.SUPER_ADMIN,
    ],
  },
  {
    id: 'admin-appointments',
    label: 'Ops Dashboard',
    path: '/admin/appointments',
    icon: FiShield,
    roles: [AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: FiSettings,
    roles: [...ALL_ROLES],
  },
  {
    id: 'audit',
    label: 'Security & Audit',
    path: '/settings?tab=security',
    icon: FiShield,
    roles: [AppRole.SUPER_ADMIN, AppRole.CITY_MANAGER, AppRole.OPERATIONS],
  },
];

export function getNavItemsForRole(role: AppRole | null): NavItem[] {
  if (!role) return [];
  return navigationItems.filter((item) => item.roles.includes(role));
}

export const OPEN_ROUTES = ['/login', '/register', '/reset-password'] as const;

export function isOpenRoute(pathname: string): boolean {
  return OPEN_ROUTES.some((route) => pathname.startsWith(route));
}
