import { createClientListStore } from '@/store/createClientListStore';
import { auditLogService } from '@/services/admin/AuditLogService';
import type { AuditLogEntry } from '@/types/adminDashboard';

export interface AuditLogFilters extends Record<string, unknown> {
  entityType: string;
  entityId: string;
}

const DEFAULT_FILTERS: AuditLogFilters = { entityType: '', entityId: '' };

export const useAuditLogStore = createClientListStore<AuditLogEntry, AuditLogFilters>({
  defaultFilters: DEFAULT_FILTERS,
  fetchFn: async ({ search, filters }) => {
    let logs = await auditLogService.list({
      entityType: filters.entityType || undefined,
      entityId: filters.entityId || undefined,
    });
    const q = search?.trim().toLowerCase();
    if (q) {
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.performedBy.toLowerCase().includes(q) ||
          (log.newValue?.toLowerCase().includes(q) ?? false) ||
          (log.oldValue?.toLowerCase().includes(q) ?? false),
      );
    }
    return logs;
  },
});

export { DEFAULT_FILTERS as DEFAULT_AUDIT_LOG_FILTERS };
