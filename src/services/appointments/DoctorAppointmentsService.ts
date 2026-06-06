import { BaseApiService } from '@/services/base';
import type {
  DoctorAppointmentDetail,
  DoctorAppointmentSummary,
  DoctorAvailabilityPayload,
  DoctorCalendarResponse,
  DoctorCalendarView,
  DoctorHoliday,
  AppointmentPrescriptionBundle,
  PrescriptionPdfInfo,
  TeleconsultationJoinPayload,
} from '@/types';

class DoctorAppointmentsService extends BaseApiService {
  async getCalendar(params: {
    view?: DoctorCalendarView;
    date?: string;
    status?: string;
  }): Promise<DoctorCalendarResponse> {
    return this.get<DoctorCalendarResponse>('/doctor/appointments/calendar', { params });
  }

  async list(filter: 'today' | 'upcoming' | 'completed' | 'missed' = 'upcoming'): Promise<DoctorAppointmentSummary[]> {
    return this.get<DoctorAppointmentSummary[]>('/doctor/appointments', { params: { filter } });
  }

  async getById(id: string): Promise<DoctorAppointmentDetail> {
    return this.get<DoctorAppointmentDetail>(`/doctor/appointments/${id}`);
  }

  async getAvailability() {
    return this.get<{ rules: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>> }>(
      '/doctor/availability',
    );
  }

  async saveAvailability(payload: DoctorAvailabilityPayload) {
    return this.put<{ rules: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>> }>(
      '/doctor/availability',
      payload,
    );
  }

  async listHolidays(): Promise<DoctorHoliday[]> {
    return this.get<DoctorHoliday[]>('/doctor/holidays');
  }

  async createHoliday(payload: {
    title: string;
    startDate: string;
    endDate: string;
    holidayType?: string;
    reason?: string;
  }): Promise<DoctorHoliday> {
    return this.post<DoctorHoliday>('/doctor/holidays', payload);
  }

  async startConsultation(id: string): Promise<DoctorAppointmentDetail> {
    return this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/start-consultation`);
  }

  async completeConsultation(id: string, payload: { summary?: string }): Promise<DoctorAppointmentDetail> {
    return this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/complete`, payload);
  }

  async markNoShow(id: string, payload: { reasonText?: string; reasonCode?: string }): Promise<DoctorAppointmentDetail> {
    return this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/no-show`, payload);
  }

  async requestReschedule(id: string, payload: { reason: string }): Promise<DoctorAppointmentDetail> {
    return this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/request-reschedule`, payload);
  }

  async addNote(id: string, payload: { note: string }): Promise<DoctorAppointmentDetail> {
    return this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/notes`, payload);
  }

  async getPrescription(appointmentId: string): Promise<AppointmentPrescriptionBundle> {
    return this.get<AppointmentPrescriptionBundle>(`/doctor/appointments/${appointmentId}/prescription`);
  }

  async savePrescription(appointmentId: string, payload: Record<string, unknown>): Promise<AppointmentPrescriptionBundle> {
    return this.post<AppointmentPrescriptionBundle>(`/doctor/appointments/${appointmentId}/prescription`, payload);
  }

  async approvePrescription(appointmentId: string, payload: { doctorNotes?: string; signatureFileId?: string }) {
    return this.post<{ prescription: AppointmentPrescriptionBundle['prescription']; pdf: PrescriptionPdfInfo }>(
      `/doctor/appointments/${appointmentId}/prescription/approve`,
      payload,
    );
  }

  async previewPrescriptionPdf(appointmentId: string): Promise<PrescriptionPdfInfo> {
    return this.get<PrescriptionPdfInfo>(`/doctor/appointments/${appointmentId}/prescription/pdf/preview`);
  }

  async saveSignature(payload: {
    registrationNumber: string;
    storageUrl?: string;
    signatureFileId?: string;
    fileName?: string;
  }) {
    return this.post('/doctor/signature', payload);
  }

  async getTeleJoin(appointmentId: string): Promise<TeleconsultationJoinPayload> {
    return this.get<TeleconsultationJoinPayload>(`/doctor/appointments/${appointmentId}/teleconsultation/join`);
  }
}

export const doctorAppointmentsService = new DoctorAppointmentsService();
