import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  SampleCollectionAnalytics,
  StaffLabPartnerProfile,
  StaffTechnicianProfile,
} from '@/types/sampleCollection';
import {
  mockGetAdminSampleAnalytics,
  mockGetLabAnalytics,
  mockListLabPartners,
  mockListTechnicians,
  mockUpdateLabPartner,
  mockUpdateTechnician,
} from './opsAnalytics.mock';

export type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

class OpsAnalyticsService extends BaseApiService {
  async getLabAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    return mockOrApi(
      () => mockGetLabAnalytics(period),
      () =>
        this.get<SampleCollectionAnalytics>('/lab/sample-collections/analytics', {
          params: { period },
        }),
    );
  }

  async getAdminSampleAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    return mockOrApi(
      () => mockGetAdminSampleAnalytics(period),
      () =>
        this.get<SampleCollectionAnalytics>('/admin/sample-collections/analytics', {
          params: { period },
        }),
    );
  }

  async listTechnicians(): Promise<StaffTechnicianProfile[]> {
    return mockOrApi(
      () => mockListTechnicians(),
      () => this.get<StaffTechnicianProfile[]>('/admin/staff/technicians'),
    );
  }

  async listLabPartners(): Promise<StaffLabPartnerProfile[]> {
    return mockOrApi(
      () => mockListLabPartners(),
      () => this.get<StaffLabPartnerProfile[]>('/admin/staff/lab-partners'),
    );
  }

  async updateTechnician(id: string, body: Partial<StaffTechnicianProfile>) {
    return mockOrApi(
      () => mockUpdateTechnician(id, body),
      () => this.patch<StaffTechnicianProfile>(`/admin/staff/technicians/${id}`, body),
    );
  }

  async updateLabPartner(id: string, body: Partial<StaffLabPartnerProfile>) {
    return mockOrApi(
      () => mockUpdateLabPartner(id, body),
      () => this.patch<StaffLabPartnerProfile>(`/admin/staff/lab-partners/${id}`, body),
    );
  }
}

export const opsAnalyticsService = new OpsAnalyticsService();
