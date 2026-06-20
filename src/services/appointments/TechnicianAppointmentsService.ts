import { BaseApiService } from '@/services/base';
import type { TechnicianRouteResponse, TechnicianScheduleItem, TechnicianTrackingResponse } from '@/types';
class TechnicianAppointmentsService extends BaseApiService {
  async getSchedule(date?: string): Promise<TechnicianScheduleItem[]> {
    return this.get<TechnicianScheduleItem[]>('/technician/schedule', { params: { date } })
  }

  async getRoute(date: string): Promise<TechnicianRouteResponse> {
    return this.get<TechnicianRouteResponse>(`/technician/routes/${date}`)
  }

  async getById(id: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(`/technician/appointments/${id}`);
  }

  async accept(id: string) {
    return this.post(`/technician/appointments/${id}/accept`)
  }

  async startJourney(id: string) {
    return this.post(`/technician/appointments/${id}/start-journey`)
  }

  async markArrived(id: string) {
    return this.post(`/technician/appointments/${id}/arrived`)
  }

  async recordGeo(payload: {
    appointmentId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number;
  }) {
    return this.post('/technician/geo', payload)
  }

  async captureConsent(id: string) {
    return this.post(`/technician/appointments/${id}/consent`, { consentType: 'home_visit', accepted: true })
  }

  async captureVitals(id: string, payload: Record<string, unknown>) {
    return this.put(`/technician/appointments/${id}/vitals`, payload)
  }

  async captureLiverFibrosisScan(id: string, payload: Record<string, unknown>) {
    return this.post(`/technician/appointments/${id}/liver-fibrosis-scan`, payload)
  }

  async collectSample(id: string, payload: Record<string, unknown>) {
    return this.post(`/technician/appointments/${id}/sample-collected`, payload)
  }

  async complete(id: string) {
    return this.post(`/technician/appointments/${id}/complete`)
  }

  async markFailed(id: string, payload: { reasonCode?: string; reasonText?: string; note?: string }) {
    return this.post(`/technician/appointments/${id}/failed`, payload)
  }

  async reportIssue(id: string, payload: { note: string; escalate?: boolean }) {
    return this.post(`/technician/appointments/${id}/issue`, payload)
  }

  async getPatientTracking(appointmentId: string): Promise<TechnicianTrackingResponse> {
    return this.get<TechnicianTrackingResponse>(`/patient/appointments/${appointmentId}/technician-tracking`)
  }
}

export const technicianAppointmentsService = new TechnicianAppointmentsService();
