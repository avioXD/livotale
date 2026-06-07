import { BaseApiService } from '@/services/base';
import type {
  SampleCollectionAnalytics,
  StaffLabPartnerProfile,
  StaffTechnicianProfile,
} from '@/types/sampleCollection';
import { LAB_DEMO_ANALYTICS } from '@/data/labSampleDemoData';

export type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

class OpsAnalyticsService extends BaseApiService {
  async getLabAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    try {
      return await this.get<SampleCollectionAnalytics>('/lab/sample-collections/analytics', {
        params: { period },
      });
    } catch {
      return { ...LAB_DEMO_ANALYTICS, period };
    }
  }

  async getAdminSampleAnalytics(period: AnalyticsPeriod = 'monthly'): Promise<SampleCollectionAnalytics> {
    try {
      return await this.get<SampleCollectionAnalytics>('/admin/sample-collections/analytics', {
        params: { period },
      });
    } catch {
      return { ...LAB_DEMO_ANALYTICS, period };
    }
  }

  async listTechnicians(): Promise<StaffTechnicianProfile[]> {
    try {
      return await this.get<StaffTechnicianProfile[]>('/admin/staff/technicians');
    } catch {
      return [
        {
          id: 'tech-1',
          userId: 'u1',
          fullName: 'Vinod K.',
          email: 'tech.mock@livotale.test',
          mobile: '+919900000003',
          employeeCode: 'TECH-MOCK-001',
          technicianType: 'home_collector',
          status: 'available',
          rating: 4.9,
          maxAppointmentsPerDay: 12,
          serviceZone: 'Mumbai South',
          samplesCollected: 18,
          samplesCompleted: 12,
          samplesHandedOver: 14,
        },
      ];
    }
  }

  async listLabPartners(): Promise<StaffLabPartnerProfile[]> {
    try {
      return await this.get<StaffLabPartnerProfile[]>('/admin/staff/lab-partners');
    } catch {
      return [
        {
          id: 'lab-1',
          name: 'Mock Lab Partner',
          contactUserId: 'u-lab',
          contactName: 'Lab Partner Ops',
          email: 'lab.mock@livotale.test',
          mobile: '+911111111112',
          registrationNumber: 'LAB-MOCK-001',
          status: 'active',
          samplesReceived: 14,
          reportsUploaded: 8,
          reportsPublished: 6,
        },
      ];
    }
  }

  async updateTechnician(id: string, body: Partial<StaffTechnicianProfile>) {
    return this.patch<StaffTechnicianProfile>(`/admin/staff/technicians/${id}`, body);
  }

  async updateLabPartner(id: string, body: Partial<StaffLabPartnerProfile>) {
    return this.patch<StaffLabPartnerProfile>(`/admin/staff/lab-partners/${id}`, body);
  }
}

export const opsAnalyticsService = new OpsAnalyticsService();
