import type { ApiRoleCode } from '@/types';
import { isDevMode } from '@/app/config/appMode';

export interface DevStaffLoginShortcut {
  label: string;
  identifier: string;
  password: string;
  activeRole?: ApiRoleCode;
}

/** Local bootstrap accounts — only exposed when VITE_APP_ENV=dev. */
export const DEV_STAFF_LOGIN_SHORTCUTS: DevStaffLoginShortcut[] = isDevMode()
  ? [
      {
        label: 'Super Admin',
        identifier: 'abhishek@livotale.com',
        password: 'Admin@123',
        activeRole: 'admin',
      },
      {
        label: 'Assigned Ops',
        identifier: 'dipten@livotale.com',
        password: 'Ops@123',
        activeRole: 'support',
      },
      {
        label: 'Dr. Vijay',
        identifier: 'dr.vijay@livotale.com',
        password: 'Doctor@123',
        activeRole: 'doctor',
      },
      {
        label: 'Technician',
        identifier: 'technician@livotale.com',
        password: 'Tech@123',
        activeRole: 'technician',
      },
      {
        label: 'Operator',
        identifier: 'vivek',
        password: 'Ops@123',
        activeRole: 'support',
      },
    ]
  : [];
