import { createClientListStore } from '@/store/createClientListStore';
import { notificationLogService } from '@/services';
import type { NotificationLogEntry } from '@/services/external/types';

export interface NotificationLogFilters extends Record<string, unknown> {
  orderId: string;
  channel: string;
}

const DEFAULT_FILTERS: NotificationLogFilters = { orderId: '', channel: '' };

export const useNotificationLogStore = createClientListStore<NotificationLogEntry, NotificationLogFilters>({
  defaultFilters: DEFAULT_FILTERS,
  fetchFn: async ({ search, filters }) => {
    let rows = await notificationLogService.list({
      orderId: filters.orderId || undefined,
      channel: filters.channel || undefined,
    });
    const q = search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (log) =>
          log.recipient.toLowerCase().includes(q) ||
          log.template.toLowerCase().includes(q) ||
          log.channel.toLowerCase().includes(q) ||
          (log.orderId?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  },
});

export { DEFAULT_FILTERS as DEFAULT_NOTIFICATION_LOG_FILTERS };
