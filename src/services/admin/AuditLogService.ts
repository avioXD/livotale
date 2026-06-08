import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { AuditLogEntry } from '@/types/adminDashboard';
import { MOCK_AUDIT_LOG } from './audit.mock';

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

class AuditLogService extends BaseApiService {
  async list(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_AUDIT_LOG];
        if (filters?.entityType) rows = rows.filter((r) => r.entityType === filters.entityType);
        if (filters?.entityId) rows = rows.filter((r) => r.entityId.includes(filters.entityId!));
        if (filters?.performedBy) rows = rows.filter((r) => r.performedBy === filters.performedBy);
        return rows.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
      },
      () => this.get<AuditLogEntry[]>('/admin/audit', { params: filters }),
    );
  }
}

export const auditLogService = new AuditLogService();
