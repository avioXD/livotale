import type { AppRole } from './auth';

export type StaffRoleKey =
  | 'technician'
  | 'doctor'
  | 'lab_partner'
  | 'dietician'
  | 'health_coach'
  | 'pharmacy'
  | 'operations';

export type StaffSectionTab = 'dashboard' | 'users';

export interface StaffRoleConfig {
  key: StaffRoleKey;
  label: string;
  description: string;
  appRole: AppRole;
}

export interface StaffMemberRow {
  id: string;
  fullName: string;
  subtitle: string;
  status: string;
  email?: string | null;
  mobile?: string | null;
  metrics: { label: string; value: string | number }[];
  profilePath?: string;
}

export interface StaffRoleDashboard {
  headline: string;
  kpis: { label: string; value: string | number; hint?: string }[];
}
