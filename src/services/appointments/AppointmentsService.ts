import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  AppointmentDetail,
  AppointmentSummary,
  AppointmentTypeOption,
  AppointmentVisitMode,
  BookAppointmentPayload,
  CancelAppointmentPayload,
  DoctorAvailabilityCalendar,
  DoctorOption,
  RescheduleAppointmentPayload,
  TimeSlotOption,
  AppointmentPrescription,
  PrescriptionPdfInfo,
  TeleconsultationJoinPayload,
} from '@/types';
import {
  mockBookAppointment,
  mockCancelAppointment,
  mockGetAppointment,
  mockGetDoctorAvailability,
  mockGetPrescription,
  mockGetPrescriptionPdf,
  mockGetSlots,
  mockGetTeleJoin,
  mockListAppointmentTypes,
  mockListAppointments,
  mockListDoctorSlots,
  mockListDoctors,
  mockRescheduleAppointment,
} from './appointments.mock';

class AppointmentsService extends BaseApiService {
  async listTypes(): Promise<AppointmentTypeOption[]> {
    return mockOrApi(
      () => mockListAppointmentTypes(),
      () => this.get<AppointmentTypeOption[]>('/patient/appointment-types'),
    );
  }

  async listMine(): Promise<AppointmentSummary[]> {
    return mockOrApi(
      () => mockListAppointments(),
      () => this.get<AppointmentSummary[]>('/patient/appointments'),
    );
  }

  async listStaff(): Promise<AppointmentSummary[]> {
    return mockOrApi(
      () => mockListAppointments(),
      () => this.get<AppointmentSummary[]>('/appointments'),
    );
  }

  async getById(id: string): Promise<AppointmentDetail> {
    return mockOrApi(
      () => mockGetAppointment(id),
      () => this.get<AppointmentDetail>(`/patient/appointments/${id}`),
    );
  }

  async getSlots(
    date: string,
    params?: { typeCode?: string; visitMode?: AppointmentVisitMode },
  ): Promise<TimeSlotOption[]> {
    return mockOrApi(
      () => mockGetSlots(date, params),
      () =>
        this.get<TimeSlotOption[]>('/patient/appointments/slots', {
          params: { date, ...params },
        }),
    );
  }

  async listDoctors(): Promise<DoctorOption[]> {
    return mockOrApi(
      () => mockListDoctors(),
      () => this.get<DoctorOption[]>('/patient/doctors'),
    );
  }

  async listDoctorSlots(
    doctorId: string,
    date: string,
    visitMode: AppointmentVisitMode = 'clinic',
  ): Promise<TimeSlotOption[]> {
    return mockOrApi(
      () => mockListDoctorSlots(doctorId, date, visitMode),
      () =>
        this.get<TimeSlotOption[]>(`/patient/doctors/${doctorId}/slots`, {
          params: { date, visitMode },
        }),
    );
  }

  async getDoctorAvailability(
    doctorId: string,
    params?: { fromDate?: string; toDate?: string },
  ): Promise<DoctorAvailabilityCalendar> {
    return mockOrApi(
      () => mockGetDoctorAvailability(doctorId, params),
      () =>
        this.get<DoctorAvailabilityCalendar>(`/patient/doctors/${doctorId}/availability`, { params }),
    );
  }

  async book(payload: BookAppointmentPayload): Promise<AppointmentSummary> {
    return mockOrApi(
      () => mockBookAppointment(payload),
      () => this.post<AppointmentSummary>('/patient/appointments', payload),
    );
  }

  async reschedule(id: string, payload: RescheduleAppointmentPayload): Promise<AppointmentSummary> {
    return mockOrApi(
      () => mockRescheduleAppointment(id, payload),
      () => this.patch<AppointmentSummary>(`/patient/appointments/${id}/reschedule`, payload),
    );
  }

  async cancel(id: string, payload: CancelAppointmentPayload = {}): Promise<AppointmentSummary> {
    return mockOrApi(
      () => mockCancelAppointment(id, payload),
      () => this.post<AppointmentSummary>(`/patient/appointments/${id}/cancel`, payload),
    );
  }

  async getPrescription(appointmentId: string): Promise<AppointmentPrescription> {
    return mockOrApi(
      () => mockGetPrescription(appointmentId),
      () => this.get<AppointmentPrescription>(`/patient/appointments/${appointmentId}/prescription`),
    );
  }

  async getPrescriptionPdf(appointmentId: string): Promise<PrescriptionPdfInfo> {
    return mockOrApi(
      () => mockGetPrescriptionPdf(appointmentId),
      () => this.get<PrescriptionPdfInfo>(`/patient/appointments/${appointmentId}/prescription/pdf`),
    );
  }

  async getTeleJoin(appointmentId: string) {
    return mockOrApi(
      () => mockGetTeleJoin(appointmentId),
      () =>
        this.get<TeleconsultationJoinPayload>(
          `/patient/appointments/${appointmentId}/teleconsultation/join`,
        ),
    );
  }
}

export const appointmentsService = new AppointmentsService();
