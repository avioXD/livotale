import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getNotificationService, getPDFGenerationService } from '@/services/external';
import type { LiverCarePrescription, PrescriptionMedicine, PrescriptionStatus } from '@/types/consultation';
import { MOCK_CONSULTATIONS, MOCK_DOCTOR_ID, MOCK_DOCTOR_NAME, MOCK_PRESCRIPTIONS } from './consultation.mock';
import { MOCK_LIVER_ORDERS } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';
import { liverCareOrderService } from './OrderService';

const DOCTOR_PROFILE = {
  degree: 'MD, DM (Hepatology)',
  registration: 'MMC-45821',
};

export type PrescriptionInput = Omit<
  LiverCarePrescription,
  'id' | 'orderId' | 'patientId' | 'consultationId' | 'doctorId' | 'doctorName' | 'doctorDegree' | 'doctorRegistration' | 'status' | 'pdfUrl' | 'fileId' | 'publishedAt' | 'revisionOf' | 'version' | 'createdAt' | 'updatedAt'
>;

class PrescriptionOrderService extends BaseApiService {
  async getForOrder(orderId: string): Promise<LiverCarePrescription | null> {
    return mockOrApi(
      () => MOCK_PRESCRIPTIONS[orderId] ?? null,
      () => this.get<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription`),
    );
  }

  async getPublishedForPatient(orderId: string, phone: string): Promise<LiverCarePrescription | null> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        const rx = MOCK_PRESCRIPTIONS[orderId];
        if (!order || !rx) return null;
        const normalized = phone.replace(/\D/g, '').slice(-10);
        const orderPhone = order.patientPhone.replace(/\D/g, '').slice(-10);
        if (normalized !== orderPhone) return null;
        if (rx.status !== 'published') return null;
        return rx;
      },
      () => this.get<LiverCarePrescription>(`/patient-portal/orders/${orderId}/prescription`),
    );
  }

  async saveDraft(orderId: string, input: PrescriptionInput): Promise<LiverCarePrescription> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const consultation = MOCK_CONSULTATIONS[orderId];
        const existing = MOCK_PRESCRIPTIONS[orderId];
        if (existing?.status === 'published') throw new Error('Prescription is published — create a revision');

        const rx: LiverCarePrescription = {
          id: existing?.id ?? `rx-${orderId}`,
          orderId,
          patientId: order.patientId,
          consultationId: consultation?.id ?? `con-${orderId}`,
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
        MOCK_PRESCRIPTIONS[orderId] = rx;
        return rx;
      },
      () => this.put<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription`, input),
    );
  }

  async publish(orderId: string): Promise<LiverCarePrescription> {
    return mockOrApi(
      async () => {
        const rx = MOCK_PRESCRIPTIONS[orderId];
        if (!rx) throw new Error('Save prescription draft first');
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId)!;

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
        MOCK_PRESCRIPTIONS[orderId] = rx;

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
          detail: `${rx.medicines.length} medicine(s) · ${rx.diagnosis}`,
          metadata: { doctorName: rx.doctorName, medicineCount: String(rx.medicines.length) },
        });
        return rx;
      },
      () => this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription/publish`),
    );
  }

  async createRevision(orderId: string): Promise<LiverCarePrescription> {
    return mockOrApi(
      () => {
        const existing = MOCK_PRESCRIPTIONS[orderId];
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
        MOCK_PRESCRIPTIONS[orderId] = revised;
        return revised;
      },
      () => this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription/revise`),
    );
  }
}

export const prescriptionOrderService = new PrescriptionOrderService();
