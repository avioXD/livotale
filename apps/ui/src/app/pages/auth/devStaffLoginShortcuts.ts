import type { ApiRoleCode } from '@/types';

export interface DevStaffLoginShortcut {
  label: string;
  identifier: string;
  password: string;
  activeRole?: ApiRoleCode;
}

/** Local bootstrap accounts — only exposed when `import.meta.env.DEV` is true. */
export const DEV_STAFF_LOGIN_SHORTCUTS: DevStaffLoginShortcut[] = import.meta.env.DEV
  ? [
      {
        label: 'Super Admin',
        identifier: 'admin@livotale.com',
        password: 'Admin@123',
        activeRole: 'admin',
      },
      {
        label: 'Operations',
        identifier: 'operations@livotale.com',
        password: 'Ops@123',
        activeRole: 'support',
      },
      {
        label: 'Doctor',
        identifier: 'doctor@livotale.com',
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
        label: 'Lab Partner',
        identifier: 'labpartner@livotale.com',
        password: 'Lab@123',
        activeRole: 'lab_partner',
      },
    ]
  : [];
