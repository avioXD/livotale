import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { Consultation, ConsultationType } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { MOCK_CONSULTATIONS, MOCK_DOCTOR_ID } from './consultation.mock';
import { MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';

class DoctorConsultationService extends BaseApiService {
  async listAssignedOrders(doctorId = MOCK_DOCTOR_ID): Promise<LiverCareOrder[]> {
    return mockOrApi(
      () =>
        MOCK_LIVER_ORDERS.filter((o) => {
          const pkg = MOCK_PACKAGES.find((p) => p.id === o.packageId);
          return o.doctorId === doctorId && pkg?.consultationIncluded && o.orderStatus !== 'cancelled';
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      () => this.get<LiverCareOrder[]>('/doctor/consultations/orders', { params: { doctorId } }),
    );
  }

  async getConsultation(orderId: string): Promise<Consultation | null> {
    return mockOrApi(
      () => MOCK_CONSULTATIONS[orderId] ?? null,
      () => this.get<Consultation>(`/doctor/consultations/${orderId}`),
    );
  }

  async ensureConsultation(orderId: string): Promise<Consultation> {
    if (MOCK_CONSULTATIONS[orderId]) return MOCK_CONSULTATIONS[orderId];
    const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const c: Consultation = {
      id: `con-${orderId}`,
      orderId,
      patientId: order.patientId,
      doctorId: order.doctorId ?? MOCK_DOCTOR_ID,
      doctorName: order.doctorName ?? 'Assigned Doctor',
      consultationType: 'video',
      status: 'doctor_assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_CONSULTATIONS[orderId] = c;
    return c;
  }

  async updateNotes(orderId: string, notes: string, followUpAt?: string): Promise<Consultation> {
    return mockOrApi(
      () => {
        const c = MOCK_CONSULTATIONS[orderId] ?? (() => { throw new Error('No consultation'); })();
        c.doctorNotes = notes;
        if (followUpAt) c.followUpAt = followUpAt;
        c.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = c;
        return c;
      },
      () => this.patch<Consultation>(`/doctor/consultations/${orderId}`, { notes, followUpAt }),
    );
  }

  async schedule(orderId: string, scheduledAt: string, type: ConsultationType = 'video'): Promise<Consultation> {
    return mockOrApi(
      () => {
        const c = MOCK_CONSULTATIONS[orderId] ?? (() => { throw new Error('No consultation'); })();
        c.scheduledAt = scheduledAt;
        c.consultationType = type;
        c.meetingLink = `https://meet.livotale.demo/${orderId}`;
        c.status = 'consultation_scheduled';
        c.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = c;
        appendOrderTimeline(orderId, 'consultation_scheduled', {
          performedBy: 'doctor',
          detail: `${type} call · ${new Date(scheduledAt).toLocaleString()}`,
          metadata: { scheduledAt, meetingLink: c.meetingLink ?? '' },
        });
        return c;
      },
      () => this.post<Consultation>(`/doctor/consultations/${orderId}/schedule`, { scheduledAt, type }),
    );
  }

  async start(orderId: string): Promise<Consultation> {
    return mockOrApi(
      () => {
        const c = MOCK_CONSULTATIONS[orderId]!;
        c.status = 'consultation_in_progress';
        c.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = c;
        return c;
      },
      () => this.post<Consultation>(`/doctor/consultations/${orderId}/start`),
    );
  }

  async complete(orderId: string): Promise<Consultation> {
    return mockOrApi(
      async () => {
        const c = MOCK_CONSULTATIONS[orderId]!;
        c.status = 'prescription_pending';
        c.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = c;
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx >= 0) {
          MOCK_LIVER_ORDERS[idx] = {
            ...MOCK_LIVER_ORDERS[idx],
            orderStatus: 'prescription_pending',
            updatedAt: new Date().toISOString(),
          };
        }
        appendOrderTimeline(orderId, 'consultation_completed', {
          performedBy: 'doctor',
          detail: 'Consultation notes saved · prescription draft pending',
        });
        return c;
      },
      () => this.post<Consultation>(`/doctor/consultations/${orderId}/complete`),
    );
  }
}

export const doctorConsultationService = new DoctorConsultationService();
