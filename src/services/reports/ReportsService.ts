import { BaseApiService } from '@/services/base';
import type { ReportDetail, ReportListItem } from '@/types';

class ReportsService extends BaseApiService {
  async list(): Promise<ReportListItem[]> {
    return this.get<ReportListItem[]>('/patient/reports');
  }

  async getByKey(reportKey: string): Promise<ReportDetail> {
    return this.get<ReportDetail>(`/patient/reports/${encodeURIComponent(reportKey)}`);
  }
}

export const reportsService = new ReportsService();
