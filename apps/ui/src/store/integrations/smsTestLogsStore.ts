import { createClientListStore } from '@/store/createClientListStore';
import {
  integrationsAdminService,
  type SmsTestLogEntry,
} from '@/services/admin/IntegrationsAdminService';

export interface SmsTestLogsFilters extends Record<string, unknown> {
  template: string;
}

const DEFAULT_FILTERS: SmsTestLogsFilters = { template: '' };

export const useSmsTestLogsStore = createClientListStore<SmsTestLogEntry, SmsTestLogsFilters>({
  defaultFilters: DEFAULT_FILTERS,
  fetchFn: async ({ search, filters }) => {
    let rows = await integrationsAdminService.listSmsTestLogs(filters.template || undefined);
    const q = search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (log) =>
          log.recipient.toLowerCase().includes(q) ||
          (log.template?.toLowerCase().includes(q) ?? false) ||
          log.status.toLowerCase().includes(q) ||
          (log.body?.toLowerCase().includes(q) ?? false) ||
          (log.providerSid?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  },
});

export { DEFAULT_FILTERS as DEFAULT_SMS_TEST_LOGS_FILTERS };
