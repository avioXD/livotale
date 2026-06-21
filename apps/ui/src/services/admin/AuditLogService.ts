import { BaseApiService } from "@/services/base";
import type { AuditLogEntry } from "@/types/adminDashboard";
export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

class AuditLogService extends BaseApiService {
  async list(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
    return this.get<AuditLogEntry[]>("/admin/audit", { params: filters })
  }
}

export const auditLogService = new AuditLogService();
