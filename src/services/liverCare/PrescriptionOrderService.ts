import { BaseApiService } from '@/services/base';
import type { LiverCarePrescription } from '@/types/consultation';

export type PrescriptionInput = Omit<
  LiverCarePrescription,
  'id' | 'orderId' | 'visitLogId' | 'patientId' | 'consultationId' | 'doctorId' | 'doctorName' | 'doctorDegree' | 'doctorRegistration' | 'status' | 'pdfUrl' | 'fileId' | 'publishedAt' | 'revisionOf' | 'version' | 'createdAt' | 'updatedAt'
>;

class PrescriptionOrderService extends BaseApiService {
  async listForOrder(orderId: string): Promise<LiverCarePrescription[]> {
    return this.get<LiverCarePrescription[]>(`/doctor/orders/${orderId}/org/prescriptions`);
  }

  async getForOrder(orderId: string): Promise<LiverCarePrescription | null> {
    return this.get<LiverCarePrescription>(`/doctor/orders/${orderId}/prescription`);
  }

  async getForVisit(orderId: string, visitLogId: string): Promise<LiverCarePrescription | null> {
    return this.get<LiverCarePrescription>(`/doctor/orders/${orderId}/org/prescriptions/${visitLogId}`);
  }

  async getPublishedForPatient(orderId: string, phone: string): Promise<LiverCarePrescription | null> {
    return this.get<LiverCarePrescription>(`/patient-portal/orders/${orderId}/prescription`, { params: { phone } });
  }

  async saveDraft(orderId: string, visitLogId: string, input: PrescriptionInput): Promise<LiverCarePrescription> {
    return this.put<LiverCarePrescription>(`/doctor/orders/${orderId}/org/prescriptions/${visitLogId}`, input);
  }

  async publish(orderId: string, visitLogId: string): Promise<LiverCarePrescription> {
    return this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/org/prescriptions/${visitLogId}/publish`);
  }

  async createRevision(orderId: string, visitLogId: string): Promise<LiverCarePrescription> {
    return this.post<LiverCarePrescription>(`/doctor/orders/${orderId}/org/prescriptions/${visitLogId}/revise`);
  }
}

export const prescriptionOrderService = new PrescriptionOrderService();
