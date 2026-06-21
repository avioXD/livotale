import { BaseApiService } from '@/services/base';
import type {
  SampleCollectionAnalytics,
  StaffLabPartnerProfile,
  StaffTechnicianProfile,
} from '@/types/sampleCollection';
export type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

class OpsAnalyticsService extends BaseApiService {
  async getLabAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    return this.get<SampleCollectionAnalytics>('/lab/sample-collections/analytics', {
          params: { period },
        })
  }

  async getAdminSampleAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    return this.get<SampleCollectionAnalytics>('/admin/sample-collections/analytics', {
          params: { period },
        })
  }

  async listTechnicians(): Promise<StaffTechnicianProfile[]> {
    return this.get<StaffTechnicianProfile[]>('/admin/staff/technicians')
  }

  async listLabPartners(): Promise<StaffLabPartnerProfile[]> {
    return this.get<StaffLabPartnerProfile[]>('/admin/staff/lab-partners/roster')
  }

  async updateTechnician(id: string, body: Partial<StaffTechnicianProfile>) {
    return this.patch<StaffTechnicianProfile>(`/admin/staff/technicians/${id}`, body)
  }

  async updateLabPartner(id: string, body: Partial<StaffLabPartnerProfile>) {
    return this.patch<StaffLabPartnerProfile>(`/admin/staff/lab-partners/${id}`, body)
  }
}

export const opsAnalyticsService = new OpsAnalyticsService();
