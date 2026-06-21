import type { LabReportUpload } from '@/types/labReport';
import type { PartnerLabStats, PartnerLabTestCharge } from '@/types/partnerLab';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { SampleDispatch } from '@/types/sampleDispatch';

export function buildPartnerLabStats(
  labId: string,
  orders: LiverCareOrder[],
  dispatches: Record<string, SampleDispatch>,
  reports: Record<string, LabReportUpload>,
): PartnerLabStats {
  const labOrders = orders.filter((o) => o.partnerLabId === labId);
  const labDispatches = Object.values(dispatches).filter((d) => d.partnerLabId === labId);
  const labReports = Object.values(reports).filter((r) => r.partnerLabId === labId);

  const dispatched = labDispatches.filter((d) =>
    ['dispatched', 'received_at_lab', 'awaiting_report', 'report_uploaded'].includes(d.status),
  ).length;
  const received = labDispatches.filter((d) =>
    ['received_at_lab', 'awaiting_report', 'report_uploaded'].includes(d.status),
  ).length;
  const uploaded = labReports.length;
  const verified = labReports.filter((r) => r.finalStatus === 'verified').length;
  const letterheadPublished = labOrders.filter((o) =>
    ['final_report_generated', 'doctor_assignment_pending', 'doctor_assigned', 'consultation_pending', 'prescription_pending', 'prescription_generated', 'completed'].includes(
      o.orderStatus,
    ),
  ).length;
  const inPipeline = labDispatches.filter((d) =>
    ['pending_dispatch', 'sample_collected', 'dispatched', 'received_at_lab', 'awaiting_report'].includes(d.status),
  ).length;

  return {
    ordersAssigned: labOrders.length,
    samplesDispatched: dispatched,
    samplesReceived: received,
    reportsUploaded: uploaded,
    reportsVerified: verified,
    letterheadPublished,
    inPipeline,
  };
}

export function estimatePartnerLabBilling(
  stats: PartnerLabStats,
  chargesPerTest: PartnerLabTestCharge[],
  packageCharges?: number | null,
): number {
  const perReport =
    packageCharges ??
    (chargesPerTest.reduce((sum, row) => sum + row.chargeInr, 0) || 0);
  return stats.reportsVerified * perReport;
}
