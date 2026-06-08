import { LAB_DEMO_ANALYTICS } from '@/services/sampleCollection/labSample.mock';
import type { AnalyticsPeriod } from '@/services/opsAnalytics/OpsAnalyticsService';
import type {
  SampleCollectionAnalytics,
  StaffLabPartnerProfile,
  StaffTechnicianProfile,
} from '@/types/sampleCollection';

export function mockGetLabAnalytics(period: AnalyticsPeriod = 'monthly'): SampleCollectionAnalytics {
  return { ...LAB_DEMO_ANALYTICS, period };
}

export function mockGetAdminSampleAnalytics(period: AnalyticsPeriod = 'monthly'): SampleCollectionAnalytics {
  return { ...LAB_DEMO_ANALYTICS, period };
}

export function mockListTechnicians(): StaffTechnicianProfile[] {
  return [
    {
      id: '00000000-0000-4000-8000-000000000103',
      userId: '00000000-0000-4000-8000-000000000103',
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

export function mockListLabPartners(): StaffLabPartnerProfile[] {
  return [
    {
      id: 'lab-1',
      name: 'Livotale Partner Lab — Bandra',
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

export function mockUpdateTechnician(id: string, body: Partial<StaffTechnicianProfile>): StaffTechnicianProfile {
  const base = mockListTechnicians()[0];
  return { ...base, id, ...body };
}

export function mockUpdateLabPartner(id: string, body: Partial<StaffLabPartnerProfile>): StaffLabPartnerProfile {
  const base = mockListLabPartners()[0];
  return { ...base, id, ...body };
}
