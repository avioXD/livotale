import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getDemoStaffDashboard, getDemoStaffMembers } from './staffDirectory.mock';
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
    return mockOrApi(
      () => getDemoStaffMembers(role),
      () => this.get<StaffMemberRow[]>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/users`),
    );
  }

  async getDashboard(role: StaffRoleKey): Promise<StaffRoleDashboard | null> {
    return mockOrApi(
      () => getDemoStaffDashboard(role),
      () => this.get<StaffRoleDashboard>(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/dashboard`),
    );
  }
}

export const staffDirectoryService = new StaffDirectoryService();
