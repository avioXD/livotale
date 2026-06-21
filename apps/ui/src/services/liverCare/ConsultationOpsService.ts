import { BaseApiService } from '@/services/base';
import type { ConsultationQueueRow } from '@/types/consultationQueue';
import type { ConsultationQueueFilters } from './consultation.queue';
import { mapConsultationQueueApiRow } from './consultation.queue';

class ConsultationOpsService extends BaseApiService {
  async listConsultationQueue(filters?: ConsultationQueueFilters): Promise<ConsultationQueueRow[]> {
    const rows = await this.get<Array<Parameters<typeof mapConsultationQueueApiRow>[0]>>('/admin/consultations/queue', {
      params: {
        search: filters?.search,
        orderStatus: filters?.orderStatus,
        stage: filters?.stage,
      },
    });
    return rows.map(mapConsultationQueueApiRow);
  }

  async getConsultationQueueRow(orderId: string): Promise<ConsultationQueueRow | null> {
    const row = await this.get<Parameters<typeof mapConsultationQueueApiRow>[0] | null>(
      `/admin/consultations/queue/${orderId}`,
    );
    return row ? mapConsultationQueueApiRow(row) : null;
  }
}

export const consultationOpsService = new ConsultationOpsService();
