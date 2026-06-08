import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getPDFGenerationService, getNotificationService } from '@/services/external';
import type { FinalReport, FinalReportPreviewData, FinalReportType } from '@/types/finalReport';
import { REPORT_TYPE_LABELS } from '@/types/finalReport';
import { MOCK_FINAL_REPORTS, DEFAULT_LETTERHEAD, nextReportNumber } from './finalReports.mock';
import { MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';
import { MOCK_FIBROSIS_SCANS } from './technicianOrder.mock';
import { MOCK_AI_JOBS } from './pathology.mock';
import { liverCareOrderService } from './OrderService';

function resolveReportType(packageCode: string): FinalReportType {
  if (packageCode === 'PKG-1') return 'fibrosis_scan_only';
  if (packageCode === 'PKG-3') return 'combined_with_consultation';
  return 'combined_scan_pathology';
}

function canGenerate(orderId: string, packageCode: string): void {
  const scan = MOCK_FIBROSIS_SCANS[orderId];
  if (!scan) throw new Error('Fibrosis scan data required before generating report');
  if (packageCode === 'PKG-2' || packageCode === 'PKG-3') {
    const ai = MOCK_AI_JOBS[orderId];
    if (!ai || ai.status !== 'verified') {
      throw new Error('Verified pathology AI extraction required before generating combined report');
    }
  }
}

class FinalReportService extends BaseApiService {
  async getForOrder(orderId: string): Promise<FinalReport | null> {
    return mockOrApi(
      () => MOCK_FINAL_REPORTS[orderId] ?? null,
      () => this.get<FinalReport>(`/admin/orders/${orderId}/final-report`),
    );
  }

  async getPublishedForPatient(orderId: string, phone: string): Promise<FinalReport | null> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        const report = MOCK_FINAL_REPORTS[orderId];
        if (!order || !report) return null;
        const normalized = phone.replace(/\D/g, '').slice(-10);
        const orderPhone = order.patientPhone.replace(/\D/g, '').slice(-10);
        if (normalized !== orderPhone) return null;
        if (report.status !== 'published' && report.status !== 'locked') return null;
        return report;
      },
      () => this.get<FinalReport>(`/patient-portal/orders/${orderId}/final-report`),
    );
  }

  async buildPreview(orderId: string): Promise<FinalReportPreviewData> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId);
        const reportType = resolveReportType(order.packageCode);
        const existing = MOCK_FINAL_REPORTS[orderId];
        const scan = MOCK_FIBROSIS_SCANS[orderId];
        const ai = MOCK_AI_JOBS[orderId];

        const preview: FinalReportPreviewData = {
          reportNumber: existing?.reportNumber ?? `RPT-PREVIEW-${order.orderNumber}`,
          reportType,
          reportTypeLabel: REPORT_TYPE_LABELS[reportType],
          patientName: order.patientName,
          patientPhone: order.patientPhone,
          orderNumber: order.orderNumber,
          packageName: order.packageName,
          generatedAt: new Date().toISOString(),
          authorizedBy: 'Dr. Clinic Lead',
          qrCodeId: existing?.qrCodeId ?? `QR-${Date.now()}`,
          interpretation: scan?.interpretation ?? 'Pending scan interpretation',
          disclaimer: pkg?.consultationIncluded
            ? 'This combined report supports your scheduled doctor consultation. Follow medical advice from your consulting physician.'
            : DEFAULT_LETTERHEAD.disclaimer,
          footer: `${DEFAULT_LETTERHEAD.companyName} · ${DEFAULT_LETTERHEAD.email} · Page 1 of 1`,
        };

        if (scan) {
          preview.fibrosisSection = {
            title: 'Liver Fibrosis Scan',
            rows: [
              { label: 'LSM (kPa)', value: String(scan.liverStiffnessKpa) },
              { label: 'CAP (dB/m)', value: String(scan.capDbm) },
              { label: 'Fibrosis stage', value: scan.fibrosisStage },
              { label: 'Steatosis grade', value: scan.steatosisGrade },
              { label: 'IQR/Median %', value: String(scan.iqrMedianPercent) },
              { label: 'Probe', value: scan.probeType },
              { label: 'Device', value: scan.deviceSerial },
            ],
          };
        }

        if (ai && (order.packageCode === 'PKG-2' || order.packageCode === 'PKG-3')) {
          preview.pathologySection = {
            title: 'Pathology Results',
            rows: ai.fields.map((f) => ({
              label: f.fieldName,
              value: f.editableValue,
              flag: f.flag,
            })),
          };
        }

        return preview;
      },
      () => this.get<FinalReportPreviewData>(`/admin/orders/${orderId}/final-report/preview`),
    );
  }

  async generate(orderId: string, authorizedBy = 'operations'): Promise<FinalReport> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        canGenerate(orderId, order.packageCode);

        const preview = await this.buildPreview(orderId);
        const pdf = getPDFGenerationService();
        const result = await pdf.generateReportPdf('default-letterhead', {
          orderId,
          preview,
          letterhead: DEFAULT_LETTERHEAD,
        });

        const existing = MOCK_FINAL_REPORTS[orderId];
        const version = (existing?.version ?? 0) + 1;
        const report: FinalReport = {
          id: existing?.id ?? `fr-${orderId}`,
          orderId,
          patientId: order.patientId,
          reportType: preview.reportType,
          reportNumber: preview.reportNumber,
          status: 'generated',
          pdfUrl: result.url,
          fileId: result.fileId,
          generatedAt: result.generatedAt,
          publishedAt: null,
          authorizedBy,
          version,
          qrCodeId: preview.qrCodeId,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_FINAL_REPORTS[orderId] = report;

        try {
          await liverCareOrderService.transition(orderId, 'generate_report');
        } catch {
          const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
          MOCK_LIVER_ORDERS[idx] = {
            ...MOCK_LIVER_ORDERS[idx],
            orderStatus: 'final_report_generated',
            updatedAt: new Date().toISOString(),
          };
        }
        appendOrderTimeline(orderId, 'final_report_generated', {
          performedBy: authorizedBy,
          detail: `${report.reportNumber} v${version} · ${preview.reportTypeLabel}`,
          metadata: { reportNumber: report.reportNumber, version: String(version) },
        });
        return report;
      },
      () => this.post<FinalReport>(`/admin/orders/${orderId}/final-report/generate`, { authorizedBy }),
    );
  }

  async publish(orderId: string): Promise<FinalReport> {
    return mockOrApi(
      async () => {
        const report = MOCK_FINAL_REPORTS[orderId];
        if (!report) throw new Error('Generate report first');
        if (report.status === 'published' || report.status === 'locked') {
          return report;
        }

        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId)!;
        report.status = 'published';
        report.publishedAt = new Date().toISOString();
        report.updatedAt = report.publishedAt;
        MOCK_FINAL_REPORTS[orderId] = report;

        const scan = MOCK_FIBROSIS_SCANS[orderId];
        if (scan) {
          MOCK_FIBROSIS_SCANS[orderId] = { ...scan, locked: true };
        }

        await getNotificationService().sendWhatsApp(
          order.patientPhone,
          `Your Livotale report ${report.reportNumber} is ready. Log in to the patient portal to download.`,
          { orderId },
        );
        await getNotificationService().sendInApp(
          order.patientId,
          'Report published',
          `Report ${report.reportNumber} is available for download.`,
          { orderId },
        );

        appendOrderTimeline(orderId, 'report_published', {
          performedBy: 'operations',
          detail: `${report.reportNumber} sent to patient portal · WhatsApp notification dispatched`,
          metadata: { reportNumber: report.reportNumber },
        });
        return report;
      },
      () => this.post<FinalReport>(`/admin/orders/${orderId}/final-report/publish`),
    );
  }

  async lock(orderId: string): Promise<FinalReport> {
    return mockOrApi(
      () => {
        const report = MOCK_FINAL_REPORTS[orderId];
        if (!report) throw new Error('No report found');
        report.status = 'locked';
        report.updatedAt = new Date().toISOString();
        MOCK_FINAL_REPORTS[orderId] = report;
        return report;
      },
      () => this.post<FinalReport>(`/admin/orders/${orderId}/final-report/lock`),
    );
  }
}

export const finalReportService = new FinalReportService();
