import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { Consultation, ConsultationType, ConsultationVisitLog, DoctorAssignedPatient } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { MOCK_CONSULTATIONS, MOCK_DOCTOR_ID, MOCK_VISIT_LOGS, getVisitLogsForOrder } from './consultation.mock';
import { MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';
import { appendOrderTimeline } from './orderTimeline';

export interface UpdateConsultationInput {
  doctorNotes?: string;
  symptoms?: string;
  followUpAt?: string;
}

export interface CompleteConsultationInput {
  doctorNotes?: string;
  symptoms?: string;
  visitCompletedAt?: string;
  followUpAt?: string;
}

export interface UpdateVisitLogInput {
  doctorNotes?: string;
  symptoms?: string;
  scheduledAt?: string;
  followUpAt?: string;
}

export interface CompleteVisitLogInput {
  doctorNotes?: string;
  symptoms?: string;
  visitCompletedAt?: string;
  followUpAt?: string;
}

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

  async listAssignedPatients(doctorId = MOCK_DOCTOR_ID): Promise<DoctorAssignedPatient[]> {
    return mockOrApi(
      () => {
        const orders = MOCK_LIVER_ORDERS.filter((o) => {
          const pkg = MOCK_PACKAGES.find((p) => p.id === o.packageId);
          return o.doctorId === doctorId && pkg?.consultationIncluded && o.orderStatus !== 'cancelled';
        });
        const byPatient = new Map<string, DoctorAssignedPatient & { latestUpdatedAt: string }>();

        for (const order of orders) {
          const consultation = MOCK_CONSULTATIONS[order.id];
          const scheduledAt = order.consultationScheduledAt ?? consultation?.scheduledAt ?? null;
          const existing = byPatient.get(order.patientId);

          if (!existing) {
            byPatient.set(order.patientId, {
              patientId: order.patientId,
              patientName: order.patientName,
              patientPhone: order.patientPhone,
              orderCount: 1,
              latestOrderId: order.id,
              latestOrderNumber: order.orderNumber,
              latestOrderStatus: order.orderStatus,
              consultationScheduledAt: scheduledAt,
              latestUpdatedAt: order.updatedAt,
            });
            continue;
          }

          existing.orderCount += 1;
          if (new Date(order.updatedAt).getTime() > new Date(existing.latestUpdatedAt).getTime()) {
            existing.latestOrderId = order.id;
            existing.latestOrderNumber = order.orderNumber;
            existing.latestOrderStatus = order.orderStatus;
            existing.consultationScheduledAt = scheduledAt;
            existing.latestUpdatedAt = order.updatedAt;
          }
        }

        return [...byPatient.values()]
          .map(({ latestUpdatedAt: _, ...patient }) => patient)
          .sort((a, b) => a.patientName.localeCompare(b.patientName));
      },
      () => this.get<DoctorAssignedPatient[]>('/doctor/consultations/patients', { params: { doctorId } }),
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
    return this.updateConsultation(orderId, { doctorNotes: notes, followUpAt });
  }

  async updateConsultation(orderId: string, input: UpdateConsultationInput): Promise<Consultation> {
    return mockOrApi(
      () => {
        const c = MOCK_CONSULTATIONS[orderId] ?? (() => { throw new Error('No consultation'); })();
        if (input.doctorNotes !== undefined) c.doctorNotes = input.doctorNotes;
        if (input.symptoms !== undefined) c.symptoms = input.symptoms;
        if (input.followUpAt !== undefined) c.followUpAt = input.followUpAt;
        c.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = c;
        return c;
      },
      () => this.patch<Consultation>(`/doctor/consultations/${orderId}`, input),
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

  async complete(orderId: string, input: CompleteConsultationInput = {}): Promise<Consultation> {
    return mockOrApi(
      async () => {
        const c = MOCK_CONSULTATIONS[orderId]!;
        const visitAt = input.visitCompletedAt ?? new Date().toISOString();

        if (input.doctorNotes !== undefined) c.doctorNotes = input.doctorNotes;
        if (input.symptoms !== undefined) c.symptoms = input.symptoms;
        if (input.followUpAt !== undefined) c.followUpAt = input.followUpAt;

        c.visitCompletedAt = visitAt;
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
          detail: 'Visit completed · prescription draft pending',
          metadata: {
            visitCompletedAt: visitAt,
            followUpAt: c.followUpAt ?? '',
            symptoms: c.symptoms ?? '',
          },
        });

        return c;
      },
      () => this.post<Consultation>(`/doctor/consultations/${orderId}/complete`, input),
    );
  }

  async listVisitLogs(orderId: string): Promise<ConsultationVisitLog[]> {
    return mockOrApi(
      () => getVisitLogsForOrder(orderId),
      () => this.get<ConsultationVisitLog[]>(`/doctor/consultations/${orderId}/visits`),
    );
  }

  async ensureInitialVisitLog(orderId: string): Promise<ConsultationVisitLog> {
    return mockOrApi(
      () => {
        const existing = getVisitLogsForOrder(orderId);
        if (existing.length) return existing[0];
        const consultation = MOCK_CONSULTATIONS[orderId] ?? (() => { throw new Error('No consultation'); })();
        const visit: ConsultationVisitLog = {
          id: `visit-${orderId}-1`,
          orderId,
          consultationId: consultation.id,
          visitType: 'initial',
          visitNumber: 1,
          scheduledAt: consultation.scheduledAt ?? null,
          visitCompletedAt: consultation.visitCompletedAt ?? null,
          followUpAt: consultation.followUpAt ?? null,
          symptoms: consultation.symptoms ?? null,
          doctorNotes: consultation.doctorNotes ?? null,
          status: consultation.visitCompletedAt ? 'completed' : 'scheduled',
          prescriptionId: null,
          createdAt: consultation.createdAt,
          updatedAt: new Date().toISOString(),
        };
        MOCK_VISIT_LOGS[orderId] = [visit];
        return visit;
      },
      () => this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/ensure-initial`),
    );
  }

  async updateVisitLog(orderId: string, visitLogId: string, input: UpdateVisitLogInput): Promise<ConsultationVisitLog> {
    return mockOrApi(
      () => {
        const logs = MOCK_VISIT_LOGS[orderId] ?? [];
        const visit = logs.find((v) => v.id === visitLogId);
        if (!visit) throw new Error('Visit log not found');
        if (input.doctorNotes !== undefined) visit.doctorNotes = input.doctorNotes;
        if (input.symptoms !== undefined) visit.symptoms = input.symptoms;
        if (input.scheduledAt !== undefined) visit.scheduledAt = input.scheduledAt;
        if (input.followUpAt !== undefined) visit.followUpAt = input.followUpAt;
        visit.updatedAt = new Date().toISOString();
        return visit;
      },
      () => this.patch<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/${visitLogId}`, input),
    );
  }

  async completeVisitLog(orderId: string, visitLogId: string, input: CompleteVisitLogInput = {}): Promise<ConsultationVisitLog> {
    return mockOrApi(
      () => {
        const logs = MOCK_VISIT_LOGS[orderId] ?? [];
        const visit = logs.find((v) => v.id === visitLogId);
        if (!visit) throw new Error('Visit log not found');
        const visitAt = input.visitCompletedAt ?? new Date().toISOString();
        if (input.doctorNotes !== undefined) visit.doctorNotes = input.doctorNotes;
        if (input.symptoms !== undefined) visit.symptoms = input.symptoms;
        if (input.followUpAt !== undefined) visit.followUpAt = input.followUpAt;
        visit.visitCompletedAt = visitAt;
        visit.status = 'completed';
        visit.updatedAt = new Date().toISOString();

        const consultation = MOCK_CONSULTATIONS[orderId];
        if (consultation) {
          consultation.visitCompletedAt = visitAt;
          consultation.doctorNotes = visit.doctorNotes;
          consultation.symptoms = visit.symptoms;
          consultation.followUpAt = visit.followUpAt;
          consultation.status = 'prescription_pending';
          consultation.updatedAt = visit.updatedAt;
        }

        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx >= 0) {
          MOCK_LIVER_ORDERS[idx] = {
            ...MOCK_LIVER_ORDERS[idx],
            orderStatus: 'prescription_pending',
            updatedAt: visit.updatedAt,
          };
        }

        appendOrderTimeline(orderId, 'consultation_completed', {
          performedBy: 'doctor',
          detail: `Visit #${visit.visitNumber} completed · prescription pending`,
          metadata: {
            visitLogId,
            visitNumber: String(visit.visitNumber),
            visitType: visit.visitType,
            visitCompletedAt: visitAt,
          },
        });

        return visit;
      },
      () => this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/${visitLogId}/complete`, input),
    );
  }

  async createFollowUpVisit(
    orderId: string,
    input: { scheduledAt: string; followUpAt?: string },
  ): Promise<ConsultationVisitLog> {
    return mockOrApi(
      () => {
        const logs = MOCK_VISIT_LOGS[orderId] ?? [];
        const consultation = MOCK_CONSULTATIONS[orderId] ?? (() => { throw new Error('No consultation'); })();
        const latestPublished = [...logs].reverse().find((v) => v.status === 'prescription_published');
        if (!latestPublished) throw new Error('Publish the current prescription before scheduling follow-up');

        const visit: ConsultationVisitLog = {
          id: `visit-${orderId}-${logs.length + 1}`,
          orderId,
          consultationId: consultation.id,
          visitType: 'follow_up',
          visitNumber: logs.length + 1,
          scheduledAt: input.scheduledAt,
          visitCompletedAt: null,
          followUpAt: input.followUpAt ?? null,
          symptoms: null,
          doctorNotes: null,
          status: 'scheduled',
          prescriptionId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_VISIT_LOGS[orderId] = [...logs, visit];

        appendOrderTimeline(orderId, 'follow_up_scheduled', {
          performedBy: 'doctor',
          detail: `Follow-up visit #${visit.visitNumber} · ${new Date(input.scheduledAt).toLocaleString()}`,
          metadata: { visitLogId: visit.id, visitNumber: String(visit.visitNumber) },
        });

        return visit;
      },
      () => this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/follow-up`, input),
    );
  }
}

export const doctorConsultationService = new DoctorConsultationService();
