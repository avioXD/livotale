import { mockOrApi } from '@/services/mock';
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
  TimelineEvent,
} from '@/types';
import { mapListItemToPatient } from '@/types/patients';
import { mockGetDashboardOverview } from './dashboard.mock';
import type { PatientClinicalContext } from '@/types/patientClinical';
import { getMockPatientClinicalContext } from './patientsClinical.mock';
import {
  getMockPatientDashboard,
  getMockPatientDetail,
  getMockPatientHistory,
  getMockPatientTimeline,
  getMockPatientTrends,
  mergeMockPatientDetail,
  mockListPatients,
  mockUpdatePatientHistorySection,
} from './patients.mock';

class PatientsService extends BaseApiService {
  async list(params: ListFetchParams<Record<string, unknown>>): Promise<PaginatedResponse<Patient>> {
    return mockOrApi(
      () => mockListPatients(params),
      async () => {
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
      },
    );
  }

  async getById(id: string): Promise<PatientDetail> {
    return mockOrApi(
      () => getMockPatientDetail(id),
      () => this.get<PatientDetail>(`/patients/${id}`),
    );
  }

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    return mockOrApi(
      () => getMockPatientTimeline(id),
      () => this.get<TimelineEvent[]>(`/patients/${id}/timeline`),
    );
  }

  async getTrends(id: string): Promise<PatientTrendPoint[]> {
    return mockOrApi(
      () => getMockPatientTrends(id),
      () => this.get<PatientTrendPoint[]>(`/patients/${id}/trends`),
    );
  }

  async getDashboard(id: string): Promise<PatientDashboardData> {
    return mockOrApi(
      () => getMockPatientDashboard(id),
      () => this.get<PatientDashboardData>(`/patients/${id}/dashboard`),
    );
  }

  async getHistory(id: string): Promise<PatientHistory> {
    return mockOrApi(
      () => getMockPatientHistory(id),
      () => this.get<PatientHistory>(`/patients/${id}/history`),
    );
  }

  async updateDemographics(id: string, payload: Record<string, unknown>): Promise<PatientDetail> {
    return mockOrApi(
      () => mergeMockPatientDetail(id, payload),
      () => this.patch<PatientDetail>(`/patients/${id}/demographics`, payload),
    );
  }

  async updateHistorySection(
    id: string,
    section: string,
    payload: Record<string, unknown>,
  ): Promise<PatientHistory> {
    return mockOrApi(
      () => mockUpdatePatientHistorySection(id, section, payload),
      () => this.patch<PatientHistory>(`/patients/${id}/history/${section}`, payload),
    );
  }

  async getClinicalContext(id: string): Promise<PatientClinicalContext> {
    return mockOrApi(
      () => getMockPatientClinicalContext(id),
      () => this.get<PatientClinicalContext>(`/patients/${id}/clinical`),
    );
  }
}

export const patientsService = new PatientsService();

class DashboardService extends BaseApiService {
  async getOverview(): Promise<DashboardOverview> {
    return mockOrApi(
      () => mockGetDashboardOverview(),
      () => this.get<DashboardOverview>('/dashboard/overview'),
    );
  }
}

export const dashboardService = new DashboardService();
