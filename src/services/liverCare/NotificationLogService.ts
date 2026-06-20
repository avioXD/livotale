import { BaseApiService } from '@/services/base';
import type { NotificationLogEntry } from '@/services/external/types';

class NotificationLogService extends BaseApiService {
  async list(filters?: { orderId?: string; channel?: string; limit?: number }): Promise<NotificationLogEntry[]> {
    return this.get<NotificationLogEntry[]>('/admin/notifications/log', { params: filters });
  }
}

export const notificationLogService = new NotificationLogService();
