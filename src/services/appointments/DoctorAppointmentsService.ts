import { mockOrApi } from '@/services/mock';
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
import {
  mockAddDoctorNote,
  mockApproveDoctorPrescription,
  mockCompleteConsultation,
  mockCreateDoctorHoliday,
  mockGetDoctorAppointment,
  mockGetDoctorAvailability,
  mockGetDoctorCalendar,
  mockGetDoctorPrescription,
  mockGetDoctorTeleJoin,
  mockListDoctorAppointments,
  mockListDoctorHolidays,
  mockMarkNoShow,
  mockPreviewDoctorPrescriptionPdf,
  mockRequestReschedule,
  mockSaveDoctorAvailability,
  mockSaveDoctorPrescription,
  mockSaveDoctorSignature,
  mockStartConsultation,
  mockUpdateDoctorClinicalData,
} from './doctorAppointments.mock';

class DoctorAppointmentsService extends BaseApiService {
  async getCalendar(params: {
    view?: DoctorCalendarView;
    date?: string;
    status?: string;
  }): Promise<DoctorCalendarResponse> {
    return mockOrApi(
      () => mockGetDoctorCalendar(params),
      () => this.get<DoctorCalendarResponse>('/doctor/appointments/calendar', { params }),
    );
  }

  async list(filter: 'today' | 'upcoming' | 'completed' | 'missed' = 'upcoming'): Promise<DoctorAppointmentSummary[]> {
    return mockOrApi(
      () => mockListDoctorAppointments(filter),
      () => this.get<DoctorAppointmentSummary[]>('/doctor/appointments', { params: { filter } }),
    );
  }

  async getById(id: string): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockGetDoctorAppointment(id),
      () => this.get<DoctorAppointmentDetail>(`/doctor/appointments/${id}`),
    );
  }

  async updateClinicalData(id: string, payload: Record<string, unknown>): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockUpdateDoctorClinicalData(id, payload),
      () => this.patch<DoctorAppointmentDetail>(`/doctor/appointments/${id}`, payload),
    );
  }

  async getAvailability() {
    return mockOrApi(
      () => mockGetDoctorAvailability(),
      () =>
        this.get<{ rules: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>> }>(
          '/doctor/availability',
        ),
    );
  }

  async saveAvailability(payload: DoctorAvailabilityPayload) {
    return mockOrApi(
      () => mockSaveDoctorAvailability(payload),
      () =>
        this.put<{ rules: Array<Record<string, unknown>>; exceptions: Array<Record<string, unknown>> }>(
          '/doctor/availability',
          payload,
        ),
    );
  }

  async listHolidays(): Promise<DoctorHoliday[]> {
    return mockOrApi(
      () => mockListDoctorHolidays(),
      () => this.get<DoctorHoliday[]>('/doctor/holidays'),
    );
  }

  async createHoliday(payload: {
    title: string;
    startDate: string;
    endDate: string;
    holidayType?: string;
    reason?: string;
  }): Promise<DoctorHoliday> {
    return mockOrApi(
      () => mockCreateDoctorHoliday(payload),
      () => this.post<DoctorHoliday>('/doctor/holidays', payload),
    );
  }

  async startConsultation(id: string): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockStartConsultation(id),
      () => this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/start-consultation`),
    );
  }

  async completeConsultation(id: string, payload: { summary?: string }): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockCompleteConsultation(id, payload),
      () => this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/complete`, payload),
    );
  }

  async markNoShow(id: string, payload: { reasonText?: string; reasonCode?: string }): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockMarkNoShow(id, payload),
      () => this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/no-show`, payload),
    );
  }

  async requestReschedule(id: string, payload: { reason: string }): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockRequestReschedule(id, payload),
      () => this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/request-reschedule`, payload),
    );
  }

  async addNote(id: string, payload: { note: string }): Promise<DoctorAppointmentDetail> {
    return mockOrApi(
      () => mockAddDoctorNote(id, payload),
      () => this.post<DoctorAppointmentDetail>(`/doctor/appointments/${id}/notes`, payload),
    );
  }

  async getPrescription(appointmentId: string): Promise<AppointmentPrescriptionBundle> {
    return mockOrApi(
      () => mockGetDoctorPrescription(appointmentId),
      () => this.get<AppointmentPrescriptionBundle>(`/doctor/appointments/${appointmentId}/prescription`),
    );
  }

  async savePrescription(appointmentId: string, payload: Record<string, unknown>): Promise<AppointmentPrescriptionBundle> {
    return mockOrApi(
      () => mockSaveDoctorPrescription(appointmentId, payload),
      () => this.post<AppointmentPrescriptionBundle>(`/doctor/appointments/${appointmentId}/prescription`, payload),
    );
  }

  async approvePrescription(appointmentId: string, payload: { doctorNotes?: string; signatureFileId?: string }) {
    return mockOrApi(
      () => mockApproveDoctorPrescription(appointmentId, payload),
      () =>
        this.post<{ prescription: AppointmentPrescriptionBundle['prescription']; pdf: PrescriptionPdfInfo }>(
          `/doctor/appointments/${appointmentId}/prescription/approve`,
          payload,
        ),
    );
  }

  async previewPrescriptionPdf(appointmentId: string): Promise<PrescriptionPdfInfo> {
    return mockOrApi(
      () => mockPreviewDoctorPrescriptionPdf(appointmentId),
      () => this.get<PrescriptionPdfInfo>(`/doctor/appointments/${appointmentId}/prescription/pdf/preview`),
    );
  }

  async saveSignature(payload: {
    registrationNumber: string;
    storageUrl?: string;
    signatureFileId?: string;
    fileName?: string;
  }) {
    return mockOrApi(
      () => mockSaveDoctorSignature(payload),
      () => this.post('/doctor/signature', payload),
    );
  }

  async getTeleJoin(appointmentId: string): Promise<TeleconsultationJoinPayload> {
    return mockOrApi(
      () => mockGetDoctorTeleJoin(appointmentId),
      () => this.get<TeleconsultationJoinPayload>(`/doctor/appointments/${appointmentId}/teleconsultation/join`),
    );
  }
}

export const doctorAppointmentsService = new DoctorAppointmentsService();
