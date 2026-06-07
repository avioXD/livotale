import { BaseApiService } from '@/services/base';
import { isApiUnavailableError } from '@/data/labSampleDemoData';
import {
  getDemoStaffDashboard,
  getDemoStaffMembers,
} from '@/data/staffHubDemoData';
import type { StaffMemberRow, StaffRoleDashboard, StaffRoleKey } from '@/types/staffHub';

const STAFF_ROLE_SLUGS: Record<StaffRoleKey, string> = {
  technician: 'technicians',
  doctor: 'doctors',
  lab_partner: 'lab-partners',
  dietician: 'dieticians',
  health_coach: 'health-coaches',
  pharmacy: 'pharmacy',
  operations: 'operations',
};

class StaffDirectoryService extends BaseApiService {
  async listUsers(role: StaffRoleKey): Promise<StaffMemberRow[]> {
    try {
      return await this.get<StaffMemberRow[]>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users`);
    } catch (err) {
      if (isApiUnavailableError(err)) return getDemoStaffMembers(role);
      throw err;
    }
  }

  async getDashboard(role: StaffRoleKey): Promise<StaffRoleDashboard | null> {
    try {
      return await this.get<StaffRoleDashboard>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/dashboard`);
    } catch (err) {
      if (isApiUnavailableError(err)) return getDemoStaffDashboard(role);
      throw err;
    }
  }
}

export const staffDirectoryService = new StaffDirectoryService();
