import {
  FiActivity,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiSettings,
  FiTruck,
  FiUsers,
  FiFileText,
  FiHeart,
} from 'react-icons/fi';
import { MdOutlineHealthAndSafety, MdOutlineScience } from 'react-icons/md';
import { AppRole, type NavItem } from '@/types';

export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: FiHome,
    roles: [AppRole.PATIENT, AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'patients',
    label: 'Patients',
    path: '/patients',
    icon: FiUsers,
    roles: [AppRole.DOCTOR, AppRole.ADMIN, AppRole.TECHNICIAN],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: FiCalendar,
    roles: [AppRole.PATIENT, AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'fibroscan',
    label: 'FibroScan',
    path: '/fibroscan',
    icon: FiActivity,
    roles: [AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FiFileText,
    roles: [AppRole.PATIENT, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'treatment-plans',
    label: 'Treatment Plans',
    path: '/treatment-plans',
    icon: MdOutlineHealthAndSafety,
    roles: [AppRole.DOCTOR, AppRole.ADMIN, AppRole.PATIENT],
  },
  {
    id: 'lab-samples',
    label: 'Lab Samples',
    path: '/lab-samples',
    icon: MdOutlineScience,
    roles: [AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    path: '/prescriptions',
    icon: FiClipboard,
    roles: [AppRole.DOCTOR, AppRole.PATIENT, AppRole.ADMIN],
  },
  {
    id: 'delivery',
    label: 'Home Delivery',
    path: '/delivery',
    icon: FiTruck,
    roles: [AppRole.PATIENT, AppRole.ADMIN],
  },
  {
    id: 'coaching',
    label: 'Health Coaching',
    path: '/coaching',
    icon: FiHeart,
    roles: [AppRole.PATIENT, AppRole.DOCTOR, AppRole.ADMIN],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: FiSettings,
    roles: [AppRole.PATIENT, AppRole.TECHNICIAN, AppRole.DOCTOR, AppRole.ADMIN],
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
