import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getFibrosisScanDeviceService } from '@/services/external';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { FibrosisScanInput, FibrosisScanRecord, TechnicianOrderVisit } from '@/types/fibrosisScan';
import { MOCK_LIVER_ORDERS } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';
import { MOCK_FIBROSIS_SCANS, MOCK_TECH_VISITS, MOCK_TECHNICIAN_ID } from './technicianOrder.mock';
import { liverCareOrderService } from './OrderService';

function ensureVisit(orderId: string): TechnicianOrderVisit {
  if (!MOCK_TECH_VISITS[orderId]) {
    const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
    MOCK_TECH_VISITS[orderId] = {
      orderId,
      technicianId: order?.technicianId ?? MOCK_TECHNICIAN_ID,
      visitStep: 'assigned',
    };
  }
  return MOCK_TECH_VISITS[orderId];
}

class TechnicianOrderService extends BaseApiService {
  async listAssigned(technicianId = MOCK_TECHNICIAN_ID): Promise<LiverCareOrder[]> {
    return mockOrApi(
      () =>
        MOCK_LIVER_ORDERS.filter(
          (o) =>
            o.technicianId === technicianId &&
            o.orderStatus !== 'cancelled' &&
            o.orderStatus !== 'completed',
        ).sort((a, b) => {
          const aTime = a.scanScheduledAt ? new Date(a.scanScheduledAt).getTime() : 0;
          const bTime = b.scanScheduledAt ? new Date(b.scanScheduledAt).getTime() : 0;
          return aTime - bTime;
        }),
      () => this.get<LiverCareOrder[]>('/technician/orders', { params: { technicianId } }),
    );
  }

  async getVisit(orderId: string): Promise<TechnicianOrderVisit | null> {
    return mockOrApi(
      () => MOCK_TECH_VISITS[orderId] ?? null,
      () => this.get<TechnicianOrderVisit>(`/technician/orders/${orderId}/visit`),
    );
  }

  async getScan(orderId: string): Promise<FibrosisScanRecord | null> {
    return mockOrApi(
      () => MOCK_FIBROSIS_SCANS[orderId] ?? null,
      () => this.get<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan`),
    );
  }

  async markVisitStarted(orderId: string): Promise<TechnicianOrderVisit> {
    return mockOrApi(
      () => {
        const visit = ensureVisit(orderId);
        visit.visitStep = 'visit_started';
        visit.visitStartedAt = new Date().toISOString();
        MOCK_TECH_VISITS[orderId] = visit;
        appendOrderTimeline(orderId, 'visit_started', { performedBy: 'technician', detail: 'En route to patient home' });
        return visit;
      },
      () => this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/visit-started`),
    );
  }

  async markReached(orderId: string): Promise<TechnicianOrderVisit> {
    return mockOrApi(
      async () => {
        const visit = ensureVisit(orderId);
        visit.visitStep = 'reached_location';
        visit.reachedAt = new Date().toISOString();
        MOCK_TECH_VISITS[orderId] = visit;
        appendOrderTimeline(orderId, 'reached_location', { performedBy: 'technician', detail: 'Scan session started' });
        try {
          await liverCareOrderService.transition(orderId, 'start_scan');
        } catch {
          // order may already be past scan_scheduled
        }
        return visit;
      },
      () => this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/reached`),
    );
  }

  async fetchDeviceScan(orderId: string, deviceSerial?: string): Promise<FibrosisScanRecord> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const device = getFibrosisScanDeviceService();
        const data = await device.fetchScanData(orderId, deviceSerial);
        const visit = ensureVisit(orderId);
        visit.visitStep = 'scan_in_progress';
        MOCK_TECH_VISITS[orderId] = visit;

        const record: FibrosisScanRecord = {
          id: `scan-${orderId}-${Date.now()}`,
          orderId,
          patientId: order.patientId,
          liverStiffnessKpa: data.lsmKpa,
          capDbm: data.capDbm,
          iqr: data.iqr,
          iqrMedianPercent: data.iqrMedianPercent,
          validMeasurements: data.validMeasurements,
          totalMeasurements: data.totalMeasurements,
          successRatePercent: data.successRatePercent,
          probeType: data.probeType,
          scanAt: data.scanAt,
          operatorName: data.operatorName,
          deviceSerial: data.deviceSerial,
          fastingStatus: data.fastingStatus,
          bmi: data.bmi,
          interpretation: data.interpretation,
          steatosisGrade: data.steatosisGrade,
          fibrosisStage: data.fibrosisStage,
          remarks: data.remarks ?? null,
          source: 'device',
          locked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_FIBROSIS_SCANS[orderId] = record;
        appendOrderTimeline(orderId, 'scan_data_fetched', {
          performedBy: 'technician',
          detail: `LSM ${data.lsmKpa} kPa · CAP ${data.capDbm} dB/m · ${data.fibrosisStage}`,
          metadata: { deviceSerial: data.deviceSerial, fibrosisStage: data.fibrosisStage },
        });
        return record;
      },
      () => this.post<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan/fetch`, { deviceSerial }),
    );
  }

  async saveScan(orderId: string, input: FibrosisScanInput): Promise<FibrosisScanRecord> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const existing = MOCK_FIBROSIS_SCANS[orderId];
        if (existing?.locked) throw new Error('Scan record is locked');

        const record: FibrosisScanRecord = {
          id: existing?.id ?? `scan-${orderId}-${Date.now()}`,
          orderId,
          patientId: order.patientId,
          ...input,
          locked: false,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_FIBROSIS_SCANS[orderId] = record;
        const visit = ensureVisit(orderId);
        visit.visitStep = 'scan_in_progress';
        MOCK_TECH_VISITS[orderId] = visit;
        appendOrderTimeline(orderId, 'scan_saved', {
          performedBy: 'technician',
          detail: `LSM ${input.liverStiffnessKpa} kPa · stage ${input.fibrosisStage}`,
        });
        return record;
      },
      () => this.post<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan`, input),
    );
  }

  async opsReviewScan(
    orderId: string,
    patch: Pick<FibrosisScanRecord, 'liverStiffnessKpa' | 'capDbm' | 'fibrosisStage' | 'steatosisGrade' | 'interpretation' | 'remarks'>,
  ): Promise<FibrosisScanRecord> {
    return mockOrApi(
      () => {
        const existing = MOCK_FIBROSIS_SCANS[orderId];
        if (!existing) throw new Error('No scan record for this order');
        if (existing.locked) throw new Error('Scan record is locked after report publish');
        const updated: FibrosisScanRecord = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        MOCK_FIBROSIS_SCANS[orderId] = updated;
        appendOrderTimeline(orderId, 'scan_reviewed', {
          performedBy: 'operations',
          detail: `Reviewed LSM ${patch.liverStiffnessKpa} kPa · ${patch.fibrosisStage}`,
        });
        return updated;
      },
      () => this.patch<FibrosisScanRecord>(`/admin/orders/${orderId}/fibrosis-scan`, patch),
    );
  }

  async attachScanFile(orderId: string, fileName: string): Promise<FibrosisScanRecord> {
    return mockOrApi(
      async () => {
        const device = getFibrosisScanDeviceService();
        const file = await device.attachScanFile(orderId, { fileName, fileType: 'application/pdf' });
        const existing = MOCK_FIBROSIS_SCANS[orderId];
        if (!existing) throw new Error('Save scan data before attaching a file');
        const updated = {
          ...existing,
          scanFileId: file.fileId,
          scanFileUrl: file.url,
          source: 'upload' as const,
          updatedAt: new Date().toISOString(),
        };
        MOCK_FIBROSIS_SCANS[orderId] = updated;
        return updated;
      },
      () => this.post<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan/attach`, { fileName }),
    );
  }

  async completeScan(orderId: string): Promise<{ visit: TechnicianOrderVisit; order: LiverCareOrder }> {
    return mockOrApi(
      async () => {
        if (!MOCK_FIBROSIS_SCANS[orderId]) {
          throw new Error('Save or fetch scan data before completing');
        }
        const visit = ensureVisit(orderId);
        visit.visitStep = 'scan_completed';
        visit.completedAt = new Date().toISOString();
        MOCK_TECH_VISITS[orderId] = visit;

        let order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId)!;
        try {
          order = await liverCareOrderService.transition(orderId, 'complete_scan');
        } catch {
          const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
          MOCK_LIVER_ORDERS[idx] = { ...order, orderStatus: 'scan_completed', updatedAt: new Date().toISOString() };
          order = MOCK_LIVER_ORDERS[idx];
          appendOrderTimeline(orderId, 'scan_completed', {
            performedBy: 'technician',
            detail: 'Scan data locked for report generation',
          });
        }
        return { visit, order };
      },
      () => this.post(`/technician/orders/${orderId}/complete`),
    );
  }

  async markUnable(orderId: string, reason: string): Promise<TechnicianOrderVisit> {
    return mockOrApi(
      () => {
        const visit = ensureVisit(orderId);
        visit.visitStep = 'unable_to_complete';
        visit.unableReason = reason;
        MOCK_TECH_VISITS[orderId] = visit;
        appendOrderTimeline(orderId, 'scan_failed', {
          performedBy: 'technician',
          detail: reason,
        });
        return visit;
      },
      () => this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/unable`, { reason }),
    );
  }
}

export const technicianOrderService = new TechnicianOrderService();
