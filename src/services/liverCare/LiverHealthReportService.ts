import { BaseApiService } from '@/services/base';
import type { LiverHealthReport } from '@/types/liverHealthReport';

class LiverHealthReportService extends BaseApiService {
  async getForOrder(orderId: string, options?: { requirePublished?: boolean; patientPhone?: string }): Promise<LiverHealthReport | null> {
    return this.get<LiverHealthReport>(`/orders/${orderId}/liver-health-report`, { params: options });
  }

  async regenerate(orderId: string): Promise<LiverHealthReport> {
    const report = await this.getForOrder(orderId);
    if (!report) throw new Error('Cannot generate liver health report — scan or pathology data missing');
    return report;
  }
}

export const liverHealthReportService = new LiverHealthReportService();
