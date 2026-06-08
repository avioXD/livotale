import type { AIExtractionJob } from '@/types/aiExtraction';
import type { LabReportQueueRow } from '@/types/labReport';
import type { LiverCarePackage } from '@/types/package';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { LabReportUpload } from '@/types/labReport';
import type { SampleDispatch } from '@/types/sampleDispatch';

export interface LabReportQueueFilters {
  search?: string;
  dispatchStatus?: string;
  labId?: string;
  extractionStatus?: string;
}

export function buildLabReportQueueRow(
  order: LiverCareOrder,
  dispatch?: SampleDispatch | null,
  report?: LabReportUpload | null,
  aiJob?: AIExtractionJob | null,
): LabReportQueueRow {
  const dispatchStatus = dispatch?.status ?? (order.partnerLabId ? 'pending_dispatch' : 'not_started');

  return {
    id: dispatch?.id ?? `lrq-${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    patientId: order.patientId,
    patientName: order.patientName,
    packageCode: order.packageCode,
    partnerLabId: order.partnerLabId ?? dispatch?.partnerLabId ?? null,
    partnerLabName: order.partnerLabName ?? dispatch?.partnerLabName ?? null,
    dispatchStatus,
    extractionStatus: report?.extractionStatus ?? aiJob?.status ?? null,
    reportFileName: report?.fileName ?? null,
    reportUploadedAt: report?.uploadedAt ?? null,
    courierRef: dispatch?.courierRef ?? null,
    updatedAt: report?.uploadedAt ?? dispatch?.updatedAt ?? order.updatedAt,
  };
}

export function buildLabReportQueueRows(
  orders: LiverCareOrder[],
  pathologyPackageIds: Set<string>,
  dispatches: Record<string, SampleDispatch>,
  reports: Record<string, LabReportUpload>,
  aiJobs: Record<string, AIExtractionJob>,
): LabReportQueueRow[] {
  return orders
    .filter(
      (o) =>
        pathologyPackageIds.has(o.packageId) &&
        o.orderStatus !== 'cancelled' &&
        o.orderStatus !== 'draft',
    )
    .map((order) =>
      buildLabReportQueueRow(
        order,
        dispatches[order.id],
        reports[order.id],
        aiJobs[order.id],
      ),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function filterLabReportQueueRows(
  rows: LabReportQueueRow[],
  filters: LabReportQueueFilters,
): LabReportQueueRow[] {
  let list = rows;
  if (filters.dispatchStatus) {
    list = list.filter((r) => r.dispatchStatus === filters.dispatchStatus);
  }
  if (filters.labId) {
    list = list.filter((r) => r.partnerLabId === filters.labId);
  }
  if (filters.extractionStatus) {
    list = list.filter((r) => r.extractionStatus === filters.extractionStatus);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((r) => {
      const hay = [
        r.orderNumber,
        r.patientName,
        r.packageCode,
        r.partnerLabName,
        r.reportFileName,
        r.courierRef,
        r.dispatchStatus,
        r.extractionStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

export function pathologyPackageIdSet(packages: LiverCarePackage[]): Set<string> {
  return new Set(packages.filter((p) => p.pathologyIncluded).map((p) => p.id));
}
