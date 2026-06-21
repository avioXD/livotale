export interface LiverCareDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  packageId?: string;
  orderStatus?: string;
  technicianId?: string;
  doctorId?: string;
  partnerLabId?: string;
  paymentStatus?: string;
}

export interface LiverCareDashboardSummary {
  enquiries: { total: number; new: number; converted: number };
  orders: {
    total: number;
    paymentPending: number;
    paymentCompleted: number;
    scanCompleted: number;
    labPending: number;
    reportPending: number;
    consultationPending: number;
    prescriptionPending: number;
  };
  revenue: { total: number; today: number; month: number };
  packageSales: Array<{
    packageId: string;
    packageCode: string;
    packageName: string;
    orderCount: number;
    revenue: number;
  }>;
  ordersByStatus: Array<{ status: string; count: number }>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
  performedBy: string;
  performedAt: string;
  ipAddress?: string | null;
}
