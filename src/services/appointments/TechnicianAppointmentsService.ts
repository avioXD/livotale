import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { TechnicianRouteResponse, TechnicianScheduleItem, TechnicianTrackingResponse } from '@/types';
import {
  mockAcceptTechnicianAppointment,
  mockCaptureTechnicianConsent,
  mockCaptureTechnicianLiverFibrosisScan,
  mockCaptureTechnicianVitals,
  mockCollectTechnicianSample,
  mockCompleteTechnicianAppointment,
  mockGetPatientTracking,
  mockGetTechnicianAppointment,
  mockGetTechnicianRoute,
  mockGetTechnicianSchedule,
  mockMarkTechnicianArrived,
  mockMarkTechnicianFailed,
  mockRecordTechnicianGeo,
  mockReportTechnicianIssue,
  mockStartTechnicianJourney,
} from './technicianAppointments.mock';

class TechnicianAppointmentsService extends BaseApiService {
  async getSchedule(date?: string): Promise<TechnicianScheduleItem[]> {
    return mockOrApi(
      () => mockGetTechnicianSchedule(date),
      () => this.get<TechnicianScheduleItem[]>('/technician/schedule', { params: { date } }),
    );
  }

  async getRoute(date: string): Promise<TechnicianRouteResponse> {
    return mockOrApi(
      () => mockGetTechnicianRoute(date),
      () => this.get<TechnicianRouteResponse>(`/technician/routes/${date}`),
    );
  }

  async getById(id: string): Promise<Record<string, unknown>> {
    return mockOrApi(
      () => mockGetTechnicianAppointment(id),
      () => this.get<Record<string, unknown>>(`/technician/appointments/${id}`),
    );
  }

  async accept(id: string) {
    return mockOrApi(
      () => mockAcceptTechnicianAppointment(id),
      () => this.post(`/technician/appointments/${id}/accept`),
    );
  }

  async startJourney(id: string) {
    return mockOrApi(
      () => mockStartTechnicianJourney(id),
      () => this.post(`/technician/appointments/${id}/start-journey`),
    );
  }

  async markArrived(id: string) {
    return mockOrApi(
      () => mockMarkTechnicianArrived(id),
      () => this.post(`/technician/appointments/${id}/arrived`),
    );
  }

  async recordGeo(payload: {
    appointmentId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number;
  }) {
    return mockOrApi(
      () => mockRecordTechnicianGeo(payload),
      () => this.post('/technician/geo', payload),
    );
  }

  async captureConsent(id: string) {
    return mockOrApi(
      () => mockCaptureTechnicianConsent(id),
      () => this.post(`/technician/appointments/${id}/consent`, { consentType: 'home_visit', accepted: true }),
    );
  }

  async captureVitals(id: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCaptureTechnicianVitals(id, payload),
      () => this.put(`/technician/appointments/${id}/vitals`, payload),
    );
  }

  async captureLiverFibrosisScan(id: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCaptureTechnicianLiverFibrosisScan(id, payload),
      () => this.post(`/technician/appointments/${id}/liver-fibrosis-scan`, payload),
    );
  }

  async collectSample(id: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCollectTechnicianSample(id, payload),
      () => this.post(`/technician/appointments/${id}/sample-collected`, payload),
    );
  }

  async complete(id: string) {
    return mockOrApi(
      () => mockCompleteTechnicianAppointment(id),
      () => this.post(`/technician/appointments/${id}/complete`),
    );
  }

  async markFailed(id: string, payload: { reasonCode?: string; reasonText?: string; note?: string }) {
    return mockOrApi(
      () => mockMarkTechnicianFailed(id, payload),
      () => this.post(`/technician/appointments/${id}/failed`, payload),
    );
  }

  async reportIssue(id: string, payload: { note: string; escalate?: boolean }) {
    return mockOrApi(
      () => mockReportTechnicianIssue(id, payload),
      () => this.post(`/technician/appointments/${id}/issue`, payload),
    );
  }

  async getPatientTracking(appointmentId: string): Promise<TechnicianTrackingResponse> {
    return mockOrApi(
      () => mockGetPatientTracking(appointmentId),
      () => this.get<TechnicianTrackingResponse>(`/patient/appointments/${appointmentId}/technician-tracking`),
    );
  }
}

export const technicianAppointmentsService = new TechnicianAppointmentsService();
