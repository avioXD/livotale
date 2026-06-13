import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getLiverHealthAIService } from '@/services/external';
import type { LiverHealthReport } from '@/types/liverHealthReport';
import { MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';
import { MOCK_FIBROSIS_SCANS } from './technicianOrder.mock';
import { MOCK_AI_JOBS } from './pathology.mock';
import { MOCK_FINAL_REPORTS } from './finalReports.mock';

const PATIENT_AGE_BY_ID: Record<string, number> = {
  'demo-patient-1': 38,
  'demo-patient-2': 45,
  'demo-patient-3': 42,
  'demo-patient-4': 36,
  'demo-patient-5': 50,
};

const PATIENT_SEX_BY_ID: Record<string, 'M' | 'F' | 'Other'> = {
  'demo-patient-1': 'F',
  'demo-patient-2': 'M',
  'demo-patient-3': 'M',
  'demo-patient-4': 'F',
};

const MOCK_LIVER_HEALTH_REPORTS: Record<string, LiverHealthReport> = {};

class LiverHealthReportService extends BaseApiService {
  private pathologyReady(orderId: string, pathologyIncluded: boolean): boolean {
    if (!pathologyIncluded) return true;
    const ai = MOCK_AI_JOBS[orderId];
    return ai?.status === 'verified';
  }

  async getForOrder(orderId: string, options?: { requirePublished?: boolean; patientPhone?: string }): Promise<LiverHealthReport | null> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        const scan = MOCK_FIBROSIS_SCANS[orderId];
        if (!order || !scan) return null;

        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId);
        const pathologyIncluded = pkg?.pathologyIncluded ?? false;

        if (!this.pathologyReady(orderId, pathologyIncluded)) return null;

        if (options?.requirePublished) {
          const report = MOCK_FINAL_REPORTS[orderId];
          if (!report || (report.status !== 'published' && report.status !== 'locked')) return null;
          if (options.patientPhone) {
            const normalized = options.patientPhone.replace(/\D/g, '').slice(-10);
            const orderPhone = order.patientPhone.replace(/\D/g, '').slice(-10);
            if (normalized !== orderPhone) return null;
          }
        }

        if (MOCK_LIVER_HEALTH_REPORTS[orderId]) {
          return MOCK_LIVER_HEALTH_REPORTS[orderId];
        }

        const finalReport = MOCK_FINAL_REPORTS[orderId];
        const ai = MOCK_AI_JOBS[orderId];
        const generated = await getLiverHealthAIService().generateReport({
          orderId,
          reportId: finalReport?.reportNumber ?? `PREVIEW-${order.orderNumber}`,
          patientName: order.patientName,
          patientAge: PATIENT_AGE_BY_ID[order.patientId] ?? 40,
          patientSex: PATIENT_SEX_BY_ID[order.patientId] ?? 'Other',
          orderNumber: order.orderNumber,
          packageName: order.packageName,
          pathologyIncluded,
          scan,
          pathologyFields: pathologyIncluded && ai?.status === 'verified' ? ai.fields : undefined,
        });

        MOCK_LIVER_HEALTH_REPORTS[orderId] = generated;
        return generated;
      },
      () => this.get<LiverHealthReport>(`/orders/${orderId}/liver-health-report`),
    );
  }

  async regenerate(orderId: string): Promise<LiverHealthReport> {
    delete MOCK_LIVER_HEALTH_REPORTS[orderId];
    const report = await this.getForOrder(orderId);
    if (!report) throw new Error('Cannot generate liver health report — scan or pathology data missing');
    return report;
  }
}

export const liverHealthReportService = new LiverHealthReportService();
