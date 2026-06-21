import { BaseApiService } from '@/services/base';
import type { LiverCareDashboardFilters, LiverCareDashboardSummary } from '@/types/adminDashboard';
class AdminDashboardService extends BaseApiService {
  async getSummary(filters?: LiverCareDashboardFilters): Promise<LiverCareDashboardSummary> {
    return this.get<LiverCareDashboardSummary>('/admin/dashboard/summary', { params: filters })
  }
}

export const adminDashboardService = new AdminDashboardService();
