import type { IconType } from 'react-icons';
import { FiBell, FiDownload, FiFileText, FiHome, FiList, FiLogOut, FiUser } from 'react-icons/fi';

export type PatientPortalNavId = 'dashboard' | 'orders' | 'notifications' | 'profile' | 'downloads';

export interface PatientPortalNavItem {
  id: PatientPortalNavId;
  label: string;
  to: string;
  icon: IconType;
  end?: boolean;
  /** Shown in bottom tab bar on mobile */
  bottomTab?: boolean;
  /** Shown in desktop sidebar primary section */
  sidebarPrimary?: boolean;
}

export const PATIENT_PORTAL_PRIMARY_NAV: PatientPortalNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', to: '/patient', icon: FiHome, end: true, bottomTab: true, sidebarPrimary: true },
  { id: 'orders', label: 'Orders', to: '/patient/orders', icon: FiList, bottomTab: true, sidebarPrimary: true },
  { id: 'notifications', label: 'Notifications', to: '/patient/notifications', icon: FiBell, bottomTab: true, sidebarPrimary: true },
  { id: 'profile', label: 'Profile', to: '/patient/profile', icon: FiUser, bottomTab: true, sidebarPrimary: true },
];

export const PATIENT_PORTAL_SECONDARY_NAV = [
  { id: 'downloads' as const, label: 'Downloads', to: '/patient/downloads', icon: FiDownload },
  { id: 'support' as const, label: 'Support', to: 'mailto:care@livotale.test', icon: FiFileText, external: true },
  { id: 'logout' as const, label: 'Logout', icon: FiLogOut },
];

export const PATIENT_PORTAL_BOTTOM_NAV = PATIENT_PORTAL_PRIMARY_NAV.filter((item) => item.bottomTab);

export const PATIENT_PORTAL_SIDEBAR_NAV = PATIENT_PORTAL_PRIMARY_NAV.filter((item) => item.sidebarPrimary);

export function isPatientPortalNavActive(pathname: string, item: PatientPortalNavItem): boolean {
  if (item.id === 'orders') {
    return pathname === '/patient/orders' || pathname.startsWith('/patient/orders/');
  }
  if (item.end) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
