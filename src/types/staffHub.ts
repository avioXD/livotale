import type { AppRole } from './auth';

export type StaffRoleKey =
  | 'technician'
  | 'doctor'
  | 'lab_partner'
  | 'dietician'
  | 'health_coach'
  | 'pharmacy'
  | 'operations'
  | 'super_admin'
  | 'city_manager';

export type StaffSectionTab = 'dashboard' | 'users';

export interface StaffRoleConfig {
  key: StaffRoleKey;
  label: string;
  description: string;
  appRole: AppRole;
}

export interface StaffMemberRow {
  id: string;
  userId?: string;
  badgeId?: string;
  fullName: string;
  subtitle: string;
  status: string;
  email?: string | null;
  mobile?: string | null;
  /** City scope for ops / field staff (org is city + pincode based). */
  city?: string | null;
  pincodes?: string[];
  /** Operations staff promoted to city manager — gains city-wide control. */
  isCityManagerPromoted?: boolean;
  assignedServiceZoneIds?: string[];
  cityManagerServiceZoneIds?: string[];
  metrics: { label: string; value: string | number }[];
  profilePath?: string;
  archivedAt?: string | null;
  archivedBy?: string | null;
}

export interface StaffArchiveBlocker {
  category: string;
  count: number;
  message: string;
}

export interface StaffArchiveEligibility {
  canArchive: boolean;
  alreadyArchived: boolean;
  memberId: string;
  fullName: string;
  roleKey: string;
  blockers: StaffArchiveBlocker[];
  message: string;
}

export interface StaffArchiveResult {
  member: StaffMemberRow;
  archivedAt: string;
  message: string;
}

export interface StaffUnarchiveResult {
  member: StaffMemberRow;
  message: string;
}

export interface StaffRoleDashboard {
  headline: string;
  kpis: { label: string; value: string | number; hint?: string }[];
}
