import { BaseApiService } from '@/services/base';
import type { CareAppointmentDetail, CareAppointmentSummary } from '@/types';

export class CareAppointmentsService extends BaseApiService {
  async list(filter: 'upcoming' | 'today' | 'completed' = 'upcoming'): Promise<CareAppointmentSummary[]> {
    return this.get<CareAppointmentSummary[]>('/care/appointments', { params: { filter } });
  }

  async getById(id: string): Promise<CareAppointmentDetail> {
    return this.get<CareAppointmentDetail>(`/care/appointments/${id}`);
  }

  async addNote(id: string, payload: { note: string; visibleToPatient?: boolean }) {
    return this.post(`/care/appointments/${id}/notes`, payload);
  }

  async recommendFollowUp(id: string, payload: { reason: string; notes?: string; followUpDays?: number }) {
    return this.post<CareAppointmentDetail>(`/care/appointments/${id}/recommend-follow-up`, payload);
  }
}

export const careAppointmentsService = new CareAppointmentsService();
