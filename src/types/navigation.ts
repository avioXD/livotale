import type { ComponentType } from 'react';
import type { AppRole } from './auth';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: AppRole[];
}
