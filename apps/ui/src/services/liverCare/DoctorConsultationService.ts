import { BaseApiService } from '@/services/base';
import type {
  Consultation,
  ConsultationType,
  ConsultationVisitLog,
  DoctorAssignedPatient,
  DoctorClinicalBundle,
  DoctorConsultationContext,
} from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';

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
  async listAssignedOrders(doctorId?: string): Promise<LiverCareOrder[]> {
    return this.get<LiverCareOrder[]>('/doctor/consultations/orders', { params: { doctorId } });
  }

  async listAssignedPatients(doctorId?: string): Promise<DoctorAssignedPatient[]> {
    return this.get<DoctorAssignedPatient[]>('/doctor/consultations/patients', { params: { doctorId } });
  }

  async getConsultation(orderId: string): Promise<Consultation | null> {
    return this.get<Consultation>(`/doctor/consultations/${orderId}`);
  }

  async getContext(orderId: string): Promise<DoctorConsultationContext> {
    return this.get<DoctorConsultationContext>(`/doctor/consultations/${orderId}/context`);
  }

  async getOrder(orderId: string): Promise<LiverCareOrder> {
    return this.get<LiverCareOrder>(`/doctor/consultations/${orderId}/order`);
  }

  async getClinical(orderId: string): Promise<DoctorClinicalBundle> {
    return this.get<DoctorClinicalBundle>(`/doctor/consultations/${orderId}/clinical`);
  }

  async ensure(orderId: string): Promise<Consultation> {
    return this.post<Consultation>(`/doctor/consultations/${orderId}/ensure`);
  }

  async ensureConsultation(orderId: string): Promise<Consultation> {
    const existing = await this.getConsultation(orderId);
    if (existing) return existing;
    return this.ensure(orderId);
  }

  async updateNotes(orderId: string, notes: string, followUpAt?: string): Promise<Consultation> {
    return this.updateConsultation(orderId, { doctorNotes: notes, followUpAt });
  }

  async updateConsultation(orderId: string, input: UpdateConsultationInput): Promise<Consultation> {
    return this.patch<Consultation>(`/doctor/consultations/${orderId}`, input)
  }

  async schedule(orderId: string, scheduledAt: string, type: ConsultationType = 'video'): Promise<Consultation> {
    return this.post<Consultation>(`/doctor/consultations/${orderId}/schedule`, { scheduledAt, type })
  }

  async start(orderId: string): Promise<Consultation> {
    return this.post<Consultation>(`/doctor/consultations/${orderId}/start`)
  }

  async complete(orderId: string, input: CompleteConsultationInput = {}): Promise<Consultation> {
    return this.post<Consultation>(`/doctor/consultations/${orderId}/complete`, input)
  }

  async listVisitLogs(orderId: string): Promise<ConsultationVisitLog[]> {
    return this.get<ConsultationVisitLog[]>(`/doctor/consultations/${orderId}/visits`)
  }

  async ensureInitialVisitLog(orderId: string): Promise<ConsultationVisitLog> {
    return this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/ensure-initial`)
  }

  async updateVisitLog(orderId: string, visitLogId: string, input: UpdateVisitLogInput): Promise<ConsultationVisitLog> {
    return this.patch<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/${visitLogId}`, input)
  }

  async completeVisitLog(orderId: string, visitLogId: string, input: CompleteVisitLogInput = {}): Promise<ConsultationVisitLog> {
    return this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/${visitLogId}/complete`, input)
  }

  async createFollowUpVisit(
    orderId: string,
    input: { scheduledAt: string; followUpAt?: string },
  ): Promise<ConsultationVisitLog> {
    return this.post<ConsultationVisitLog>(`/doctor/consultations/${orderId}/visits/follow-up`, input)
  }
}

export const doctorConsultationService = new DoctorConsultationService();
