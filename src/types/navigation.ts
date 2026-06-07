import type { ComponentType } from 'react';
import type { AppRole } from './auth';

/** Sidebar section id — items with the same group render under one heading. */
export type NavGroupId =
  | 'overview'
  | 'patient-care'
  | 'technician-ops'
  | 'lab-ops'
  | 'clinical'
  | 'fulfillment'
  | 'admin-ops'
  | 'staff-management'
  | 'account';

export interface NavChildItem {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** When set, child is shown only for these roles */
  roles?: AppRole[];
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: AppRole[];
  group?: NavGroupId;
  /** Nested links under the group heading in the main sidebar */
  children?: NavChildItem[];
  /** When true, only children render (group label is the section heading; parent is not a link) */
  childrenOnly?: boolean;
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: NavItem[];
}
