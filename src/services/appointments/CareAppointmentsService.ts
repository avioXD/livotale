import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { CareAppointmentDetail, CareAppointmentSummary } from '@/types';
import {
  addCareAppointmentNote,
  getCareAppointmentById,
  listCareAppointments,
  recommendCareFollowUp,
} from './careAppointments.mock';

class CareAppointmentsService extends BaseApiService {
  async list(filter: 'upcoming' | 'today' | 'completed' = 'upcoming'): Promise<CareAppointmentSummary[]> {
    return mockOrApi(
      () => listCareAppointments(filter),
      () => this.get<CareAppointmentSummary[]>('/care/appointments', { params: { filter } }),
    );
  }

  async getById(id: string): Promise<CareAppointmentDetail> {
    return mockOrApi(
      () => {
        const row = getCareAppointmentById(id);
        if (!row) throw new Error('Care appointment not found');
        return row;
      },
      () => this.get<CareAppointmentDetail>(`/care/appointments/${id}`),
    );
  }

  async addNote(id: string, payload: { note: string; visibleToPatient?: boolean }) {
    return mockOrApi(
      () => addCareAppointmentNote(id, payload.note),
      () => this.post(`/care/appointments/${id}/notes`, payload),
    );
  }

  async recommendFollowUp(id: string, payload: { reason: string; notes?: string; followUpDays?: number }) {
    return mockOrApi(
      () => recommendCareFollowUp(id, payload.reason, payload.followUpDays),
      () => this.post<CareAppointmentDetail>(`/care/appointments/${id}/recommend-follow-up`, payload),
    );
  }
}

export const careAppointmentsService = new CareAppointmentsService();
