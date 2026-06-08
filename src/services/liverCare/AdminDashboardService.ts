import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { LiverCareDashboardFilters, LiverCareDashboardSummary } from '@/types/adminDashboard';
import { buildDashboardSummary } from './dashboard.mock';

class AdminDashboardService extends BaseApiService {
  async getSummary(filters?: LiverCareDashboardFilters): Promise<LiverCareDashboardSummary> {
    return mockOrApi(
      () => buildDashboardSummary(filters),
      () => this.get<LiverCareDashboardSummary>('/admin/dashboard/summary', { params: filters }),
    );
  }
}

export const adminDashboardService = new AdminDashboardService();
