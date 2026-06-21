import { BaseApiService } from '@/services/base';
import type { AIExtractionJob, ExtractedField } from '@/types/aiExtraction';

class AIExtractionOrderService extends BaseApiService {
  async getJobForOrder(orderId: string): Promise<AIExtractionJob | null> {
    return this.get<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction`)
  }

  async listPendingReview(): Promise<AIExtractionJob[]> {
    return this.get<AIExtractionJob[]>('/admin/ai-extraction/pending')
  }

  async triggerExtraction(orderId: string): Promise<AIExtractionJob> {
    return this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extract`)
  }

  async updateFields(orderId: string, fields: ExtractedField[]): Promise<AIExtractionJob> {
    return this.patch<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/fields`, { fields })
  }

  async requestReupload(orderId: string): Promise<AIExtractionJob> {
    return this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/reupload`)
  }

  async verifyExtraction(orderId: string, _verifiedBy = 'operations'): Promise<AIExtractionJob> {
    return this.post<AIExtractionJob>(`/admin/orders/${orderId}/ai-extraction/verify`)
  }
}

export const aiExtractionOrderService = new AIExtractionOrderService();
