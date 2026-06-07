import { BaseApiService } from '@/services/base';
import type {
  AdminAppointmentDetail,
  AdminAppointmentSummary,
  AdminAppointmentsDashboard,
  AdminRouteLiveItem,
  AdminWalkInBookPayload,
  AdminWalkInBookResult,
  AppointmentReminderLog,
  AppointmentTypeOption,
  AppointmentAnalytics,
  AppointmentVisitMode,
  DoctorAvailabilityCalendar,
  DoctorOption,
  TimeSlotOption,
} from '@/types';

export class AdminAppointmentsService extends BaseApiService {
  async getDashboard(): Promise<AdminAppointmentsDashboard> {
    return this.get<AdminAppointmentsDashboard>('/admin/appointments/dashboard');
  }

  async list(params: Record<string, string | undefined> = {}): Promise<AdminAppointmentSummary[]> {
    return this.get<AdminAppointmentSummary[]>('/admin/appointments', { params });
  }

  async getById(id: string): Promise<AdminAppointmentDetail> {
    return this.get<AdminAppointmentDetail>(`/admin/appointments/${id}`);
  }

  async update(id: string, payload: Record<string, unknown>): Promise<AdminAppointmentDetail> {
    return this.patch<AdminAppointmentDetail>(`/admin/appointments/${id}`, payload);
  }

  async cancelAppointment(id: string, payload: { reason?: string; notes?: string } = {}): Promise<{ deleted: boolean; id: string }> {
    return this.delete<{ deleted: boolean; id: string }>(`/admin/appointments/${id}`, { data: payload });
  }

  async assign(id: string, payload: { doctorId?: string; technicianId?: string; notify?: boolean }) {
    return this.patch<AdminAppointmentSummary>(`/admin/appointments/${id}/assign`, payload);
  }

  async overrideStatus(id: string, payload: { status: string; reason: string; notes?: string }) {
    return this.patch<AdminAppointmentSummary>(`/admin/appointments/${id}/status`, payload);
  }

  async sendReminder(id: string, payload: { reminderType?: string } = {}) {
    return this.post<AppointmentReminderLog>(`/admin/appointments/${id}/remind`, payload);
  }

  async listMissed(): Promise<AdminAppointmentSummary[]> {
    return this.get<AdminAppointmentSummary[]>('/admin/appointments/missed');
  }

  async handleMissed(id: string, payload: { action: 'follow_up' | 'closed'; reason?: string }) {
    return this.patch<AdminAppointmentSummary>(`/admin/appointments/${id}/missed`, payload);
  }

  async getRouteLive(date?: string): Promise<AdminRouteLiveItem[]> {
    return this.get<AdminRouteLiveItem[]>('/admin/appointments/route-live', { params: { date } });
  }

  async listReminderLogs(limit = 100): Promise<AppointmentReminderLog[]> {
    return this.get<AppointmentReminderLog[]>('/admin/appointment-reminder-logs', { params: { limit } });
  }

  async listAppointmentTypes(): Promise<AppointmentTypeOption[]> {
    return this.get<AppointmentTypeOption[]>('/admin/appointment-types');
  }

  async getAnalytics(): Promise<AppointmentAnalytics> {
    return this.get<AppointmentAnalytics>('/admin/analytics/appointments');
  }

  async listDoctors(): Promise<DoctorOption[]> {
    return this.get<DoctorOption[]>('/admin/doctors');
  }

  async getDoctorAvailability(
    doctorId: string,
    params?: { fromDate?: string; toDate?: string },
  ): Promise<DoctorAvailabilityCalendar> {
    return this.get<DoctorAvailabilityCalendar>(`/admin/doctors/${doctorId}/availability`, { params });
  }

  async listDoctorSlots(
    doctorId: string,
    date: string,
    visitMode: AppointmentVisitMode = 'clinic',
  ): Promise<TimeSlotOption[]> {
    return this.get<TimeSlotOption[]>(`/admin/doctors/${doctorId}/slots`, {
      params: { date, visitMode },
    });
  }

  async walkInBook(payload: AdminWalkInBookPayload): Promise<AdminWalkInBookResult> {
    return this.post<AdminWalkInBookResult>('/admin/appointments/walk-in', payload);
  }
}

export const adminAppointmentsService = new AdminAppointmentsService();
