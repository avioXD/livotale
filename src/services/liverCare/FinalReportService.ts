import { BaseApiService } from '@/services/base';
import type { FinalReport, FinalReportPreviewData } from '@/types/finalReport';

class FinalReportService extends BaseApiService {
  async getForOrder(orderId: string): Promise<FinalReport | null> {
    return this.get<FinalReport>(`/admin/orders/${orderId}/final-report`);
  }

  async getPublishedForPatient(orderId: string, phone: string): Promise<FinalReport | null> {
    return this.get<FinalReport>(`/patient-portal/orders/${orderId}/final-report`, { params: { phone } });
  }

  async buildPreview(orderId: string): Promise<FinalReportPreviewData> {
    return this.get<FinalReportPreviewData>(`/admin/orders/${orderId}/final-report/preview`);
  }

  async generate(orderId: string, authorizedBy = 'operations'): Promise<FinalReport> {
    return this.post<FinalReport>(`/admin/orders/${orderId}/final-report/generate`, { authorizedBy });
  }

  async publish(orderId: string): Promise<FinalReport> {
    return this.post<FinalReport>(`/admin/orders/${orderId}/final-report/publish`);
  }

  async lock(orderId: string): Promise<FinalReport> {
    return this.post<FinalReport>(`/admin/orders/${orderId}/final-report/lock`);
  }
}

export const finalReportService = new FinalReportService();
