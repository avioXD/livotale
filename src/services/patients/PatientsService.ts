import { BaseApiService } from '@/services/base';
import type {
  DashboardOverview,
  ListFetchParams,
  PaginatedResponse,
  Patient,
  PatientDashboardData,
  PatientDetail,
  PatientHistory,
  PatientListItem,
  PatientTrendPoint,
  ReportListItem,
  TimelineEvent,
} from '@/types';
import type { PatientAppointmentRecord, PatientVisitRecord } from '@/types/patientProfile';
import { mapListItemToPatient } from '@/types/patients';
import {
  getMockPatientAppointments,
  getMockPatientDashboard,
  getMockPatientDetail,
  getMockPatientHistory,
  getMockPatientReports,
  getMockPatientTimeline,
  getMockPatientTrends,
  getMockPatientVisits,
  mergeMockPatientDetail,
} from './patientProfileMockData';

async function withMockFallback<T>(apiCall: () => Promise<T>, mock: () => T): Promise<T> {
  try {
    return await apiCall();
  } catch {
    return mock();
  }
}

class PatientsService extends BaseApiService {
  async list(params: ListFetchParams<Record<string, unknown>>): Promise<PaginatedResponse<Patient>> {
    const raw = await this.get<{
      items: PatientListItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>('/patients', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        ...params.filters,
      },
    });
    return {
      data: raw.items.map(mapListItemToPatient),
      total: raw.total,
      page: raw.page,
      pageSize: raw.pageSize,
      totalPages: raw.totalPages,
    };
  }

  async getById(id: string): Promise<PatientDetail> {
    return withMockFallback(
      () => this.get<PatientDetail>(`/patients/${id}`),
      () => getMockPatientDetail(id),
    );
  }

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    return withMockFallback(
      () => this.get<TimelineEvent[]>(`/patients/${id}/timeline`),
      () => getMockPatientTimeline(id),
    );
  }

  async getTrends(id: string): Promise<PatientTrendPoint[]> {
    return withMockFallback(
      () => this.get<PatientTrendPoint[]>(`/patients/${id}/trends`),
      () => getMockPatientTrends(id),
    );
  }

  async getDashboard(id: string): Promise<PatientDashboardData> {
    return withMockFallback(
      () => this.get<PatientDashboardData>(`/patients/${id}/dashboard`),
      () => getMockPatientDashboard(id),
    );
  }

  async getHistory(id: string): Promise<PatientHistory> {
    return withMockFallback(
      () => this.get<PatientHistory>(`/patients/${id}/history`),
      () => getMockPatientHistory(id),
    );
  }

  async updateDemographics(id: string, payload: Record<string, unknown>): Promise<PatientDetail> {
    return withMockFallback(
      () => this.patch<PatientDetail>(`/patients/${id}/demographics`, payload),
      () => mergeMockPatientDetail(id, payload),
    );
  }

  async updateHistorySection(
    id: string,
    section: string,
    payload: Record<string, unknown>,
  ): Promise<PatientHistory> {
    return this.patch<PatientHistory>(`/patients/${id}/history/${section}`, payload);
  }

  /** Appointments tab — API when available, mock fallback for now */
  async getAppointments(id: string): Promise<PatientAppointmentRecord[]> {
    return withMockFallback(
      () => this.get<PatientAppointmentRecord[]>(`/patients/${id}/appointments`),
      () => getMockPatientAppointments(id),
    );
  }

  /** Home visits tab — API when available, mock fallback for now */
  async getVisits(id: string): Promise<PatientVisitRecord[]> {
    return withMockFallback(
      () => this.get<PatientVisitRecord[]>(`/patients/${id}/visits`),
      () => getMockPatientVisits(id),
    );
  }

  /** Clinical reports for staff viewing a patient profile */
  async getReports(id: string): Promise<ReportListItem[]> {
    return withMockFallback(
      () => this.get<ReportListItem[]>(`/patients/${id}/reports`),
      () => getMockPatientReports(id),
    );
  }
}

export const patientsService = new PatientsService();

class DashboardService extends BaseApiService {
  async getOverview(): Promise<DashboardOverview> {
    return this.get<DashboardOverview>('/dashboard/overview');
  }
}

export const dashboardService = new DashboardService();
