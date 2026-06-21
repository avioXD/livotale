import { BaseApiService } from '@/services/base';
import type {
  DashboardOverview,
  ListFetchParams,
  PaginatedResponse,
  Patient,
  PatientDetail,
  PatientHistory,
  PatientListItem,
} from '@/types';
import { mapListItemToPatient } from '@/types/patients';
import type { PatientClinicalContext } from '@/types/patientClinical';
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
    return this.get<PatientDetail>(`/patients/${id}`)
  }

  async getHistory(id: string): Promise<PatientHistory> {
    return this.get<PatientHistory>(`/patients/${id}/history`)
  }

  async updateDemographics(id: string, payload: Record<string, unknown>): Promise<PatientDetail> {
    return this.patch<PatientDetail>(`/patients/${id}/demographics`, payload)
  }

  async updateHistorySection(
    id: string,
    section: string,
    payload: Record<string, unknown>,
  ): Promise<PatientHistory> {
    return this.patch<PatientHistory>(`/patients/${id}/history/${section}`, payload)
  }

  async getClinicalContext(id: string): Promise<PatientClinicalContext> {
    return this.get<PatientClinicalContext>(`/patients/${id}/clinical`)
  }
}

export const patientsService = new PatientsService();

class DashboardService extends BaseApiService {
  async getOverview(): Promise<DashboardOverview> {
    return this.get<DashboardOverview>('/dashboard/overview')
  }
}

export const dashboardService = new DashboardService();
