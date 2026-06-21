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
class AppointmentsService extends BaseApiService {
  async listTypes(): Promise<AppointmentTypeOption[]> {
    return this.get<AppointmentTypeOption[]>('/patient/appointment-types')
  }

  async listMine(): Promise<AppointmentSummary[]> {
    return this.get<AppointmentSummary[]>('/patient/appointments')
  }

  async listStaff(): Promise<AppointmentSummary[]> {
    return this.get<AppointmentSummary[]>('/appointments')
  }

  async getById(id: string): Promise<AppointmentDetail> {
    return this.get<AppointmentDetail>(`/patient/appointments/${id}`)
  }

  async getSlots(
    date: string,
    params?: { typeCode?: string; visitMode?: AppointmentVisitMode },
  ): Promise<TimeSlotOption[]> {
    return this.get<TimeSlotOption[]>('/patient/appointments/slots', {
          params: { date, ...params },
        })
  }

  async listDoctors(): Promise<DoctorOption[]> {
    return this.get<DoctorOption[]>('/patient/doctors')
  }

  async listDoctorSlots(
    doctorId: string,
    date: string,
    visitMode: AppointmentVisitMode = 'clinic',
  ): Promise<TimeSlotOption[]> {
    return this.get<TimeSlotOption[]>(`/patient/doctors/${doctorId}/slots`, {
          params: { date, visitMode },
        })
  }

  async getDoctorAvailability(
    doctorId: string,
    params?: { fromDate?: string; toDate?: string },
  ): Promise<DoctorAvailabilityCalendar> {
    return this.get<DoctorAvailabilityCalendar>(`/patient/doctors/${doctorId}/availability`, { params })
  }

  async book(payload: BookAppointmentPayload): Promise<AppointmentSummary> {
    return this.post<AppointmentSummary>('/patient/appointments', payload)
  }

  async reschedule(id: string, payload: RescheduleAppointmentPayload): Promise<AppointmentSummary> {
    return this.patch<AppointmentSummary>(`/patient/appointments/${id}/reschedule`, payload)
  }

  async cancel(id: string, payload: CancelAppointmentPayload = {}): Promise<AppointmentSummary> {
    return this.post<AppointmentSummary>(`/patient/appointments/${id}/cancel`, payload)
  }

  async getPrescription(appointmentId: string): Promise<AppointmentPrescription> {
    return this.get<AppointmentPrescription>(`/patient/appointments/${appointmentId}/prescription`)
  }

  async getPrescriptionPdf(appointmentId: string): Promise<PrescriptionPdfInfo> {
    return this.get<PrescriptionPdfInfo>(`/patient/appointments/${appointmentId}/prescription/pdf`)
  }

  async getTeleJoin(appointmentId: string) {
    return this.get<TeleconsultationJoinPayload>(
          `/patient/appointments/${appointmentId}/teleconsultation/join`,
        )
  }
}

export const appointmentsService = new AppointmentsService();
