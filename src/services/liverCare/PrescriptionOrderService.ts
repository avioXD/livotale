import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getNotificationService, getPDFGenerationService } from '@/services/external';
import type { LiverCarePrescription, PrescriptionMedicine } from '@/types/consultation';
import {
  getLatestPrescriptionForOrder,
  getPrescriptionForVisit,
  getPrescriptionsForOrder,
  MOCK_CONSULTATIONS,
  MOCK_DOCTOR_ID,
  MOCK_DOCTOR_NAME,
  MOCK_PRESCRIPTIONS,
  MOCK_VISIT_LOGS,
} from './consultation.mock';
import { MOCK_LIVER_ORDERS } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';
import { liverCareOrderService } from './OrderService';

const DOCTOR_PROFILE = {
  degree: 'MD, DM (Hepatology)',
  registration: 'MMC-45821',
};

export type PrescriptionInput = Omit<
  LiverCarePrescription,
  'id' | 'orderId' | 'visitLogId' | 'patientId' | 'consultationId' | 'doctorId' | 'doctorName' | 'doctorDegree' | 'doctorRegistration' | 'status' | 'pdfUrl' | 'fileId' | 'publishedAt' | 'revisionOf' | 'version' | 'createdAt' | 'updatedAt'
>;

function upsertPrescription(orderId: string, rx: LiverCarePrescription): void {
  const list = MOCK_PRESCRIPTIONS[orderId] ?? [];
  const idx = list.findIndex((row) => row.visitLogId === rx.visitLogId);
  if (idx >= 0) list[idx] = rx;
  else list.push(rx);
  MOCK_PRESCRIPTIONS[orderId] = list;
}

class PrescriptionOrderService extends BaseApiService {
  async listForOrder(orderId: string): Promise<LiverCarePrescription[]> {
    return mockOrApi(
      () => getPrescriptionsForOrder(orderId),
      () => this.get<LiverCarePrescription[]>(`/doctor/orders/${orderId}/prescriptions`),
    );
  }

  async getForOrder(orderId: string): Promise<LiverCarePrescription | null> {
    return mockOrApi(
      () => getLatestPrescriptionForOrder(orderId),
      () => this.get<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription`),
    );
  }

  async getForVisit(orderId: string, visitLogId: string): Promise<LiverCarePrescription | null> {
    return mockOrApi(
      () => getPrescriptionForVisit(orderId, visitLogId),
      () => this.get<LiverCarePrescription>(`/doctor/orders/${orderId}/prescriptions/${visitLogId}`),
    );
  }

  async getPublishedForPatient(orderId: string, phone: string): Promise<LiverCarePrescription | null> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) return null;
        const normalized = phone.replace(/\D/g, '').slice(-10);
        const orderPhone = order.patientPhone.replace(/\D/g, '').slice(-10);
        if (normalized !== orderPhone) return null;
        const published = getPrescriptionsForOrder(orderId)
          .filter((rx) => rx.status === 'published')
          .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime());
        return published[0] ?? null;
      },
      () => this.get<LiverCarePrescription>(`/patient-portal/orders/${orderId}/prescription`),
    );
  }

  async saveDraft(orderId: string, visitLogId: string, input: PrescriptionInput): Promise<LiverCarePrescription> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const visit = (MOCK_VISIT_LOGS[orderId] ?? []).find((v) => v.id === visitLogId);
        if (!visit) throw new Error('Visit log not found');
        const existing = getPrescriptionForVisit(orderId, visitLogId);
        if (existing?.status === 'published') throw new Error('Prescription is published — schedule a follow-up visit for a new Rx');

        const rx: LiverCarePrescription = {
          id: existing?.id ?? `rx-${visitLogId}`,
          orderId,
          visitLogId,
          patientId: order.patientId,
          consultationId: visit.consultationId,
          doctorId: MOCK_DOCTOR_ID,
          doctorName: MOCK_DOCTOR_NAME,
          doctorDegree: DOCTOR_PROFILE.degree,
          doctorRegistration: DOCTOR_PROFILE.registration,
          status: 'draft',
          ...input,
          version: existing?.version ?? 1,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertPrescription(orderId, rx);
        visit.status = 'prescription_draft';
        visit.prescriptionId = rx.id;
        visit.updatedAt = new Date().toISOString();
        return rx;
      },
      () => this.put<LiverCarePrescription>(`/doctor/orders/${orderId}/prescriptions/${visitLogId}`, input),
    );
  }

  async publish(orderId: string, visitLogId: string): Promise<LiverCarePrescription> {
    return mockOrApi(
      async () => {
        const rx = getPrescriptionForVisit(orderId, visitLogId);
        if (!rx) throw new Error('Save prescription draft first');
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId)!;
        const visit = (MOCK_VISIT_LOGS[orderId] ?? []).find((v) => v.id === visitLogId)!;

        const pdf = getPDFGenerationService();
        const result = await pdf.generatePrescriptionPdf('default-rx', {
          prescriptionId: rx.id,
          orderId,
          patientName: order.patientName,
          doctorName: rx.doctorName,
          diagnosis: rx.diagnosis,
          medicines: rx.medicines,
        });

        rx.status = 'published';
        rx.pdfUrl = result.url;
        rx.fileId = result.fileId;
        rx.publishedAt = new Date().toISOString();
        rx.updatedAt = rx.publishedAt;
        upsertPrescription(orderId, rx);

        visit.status = 'prescription_published';
        visit.prescriptionId = rx.id;
        visit.updatedAt = rx.updatedAt;

        if (MOCK_CONSULTATIONS[orderId]) {
          MOCK_CONSULTATIONS[orderId].status = 'prescription_published';
        }

        try {
          await liverCareOrderService.transition(orderId, 'publish_prescription');
        } catch {
          const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
          MOCK_LIVER_ORDERS[idx] = {
            ...MOCK_LIVER_ORDERS[idx],
            orderStatus: 'prescription_generated',
            updatedAt: new Date().toISOString(),
          };
        }

        await getNotificationService().sendWhatsApp(
          order.patientPhone,
          `Your prescription from ${rx.doctorName} is ready. Log in to the patient portal to download.`,
          { orderId },
        );

        appendOrderTimeline(orderId, 'prescription_published', {
          performedBy: 'doctor',
          detail: `Visit #${visit.visitNumber} · ${rx.medicines.length} medicine(s) · ${rx.diagnosis}`,
          metadata: {
            visitLogId,
            visitNumber: String(visit.visitNumber),
            doctorName: rx.doctorName,
            medicineCount: String(rx.medicines.length),
          },
        });
        return rx;
      },
      () => this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/prescriptions/${visitLogId}/publish`),
    );
  }

  async createRevision(orderId: string, visitLogId: string): Promise<LiverCarePrescription> {
    return mockOrApi(
      () => {
        const existing = getPrescriptionForVisit(orderId, visitLogId);
        if (existing?.status !== 'published') throw new Error('No published prescription to revise');
        const revised: LiverCarePrescription = {
          ...existing,
          status: 'draft',
          revisionOf: existing.id,
          version: existing.version + 1,
          publishedAt: null,
          pdfUrl: null,
          fileId: null,
          updatedAt: new Date().toISOString(),
        };
        upsertPrescription(orderId, revised);
        const visit = (MOCK_VISIT_LOGS[orderId] ?? []).find((v) => v.id === visitLogId);
        if (visit) visit.status = 'prescription_draft';
        return revised;
      },
      () => this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/prescriptions/${visitLogId}/revise`),
    );
  }
}

export const prescriptionOrderService = new PrescriptionOrderService();
