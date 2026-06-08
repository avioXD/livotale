import { LAB_DEMO_ANALYTICS } from '@/services/sampleCollection/labSample.mock';
import { MOCK_LIVER_ORDERS } from '@/services/liverCare/liverCare.mock';
import { buildPartnerLabStats } from '@/services/liverCare/partnerLab.stats';
import { MOCK_LAB_REPORTS, MOCK_PARTNER_LABS, MOCK_SAMPLE_DISPATCHES } from '@/services/liverCare/pathology.mock';
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
  return MOCK_PARTNER_LABS.map((lab) => {
    const stats = buildPartnerLabStats(lab.id, MOCK_LIVER_ORDERS, MOCK_SAMPLE_DISPATCHES, MOCK_LAB_REPORTS);
    return {
      id: lab.id,
      name: lab.name,
      contactUserId: null,
      contactName: lab.contactPerson,
      email: lab.email,
      mobile: lab.phone,
      registrationNumber: lab.registrationNumber ?? null,
      status: lab.active ? 'active' : 'inactive',
      samplesReceived: stats.samplesReceived,
      reportsUploaded: stats.reportsUploaded,
      reportsPublished: stats.letterheadPublished,
    };
  });
}

export function mockUpdateTechnician(id: string, body: Partial<StaffTechnicianProfile>): StaffTechnicianProfile {
  const base = mockListTechnicians()[0];
  return { ...base, id, ...body };
}

export function mockUpdateLabPartner(id: string, body: Partial<StaffLabPartnerProfile>): StaffLabPartnerProfile {
  const base = mockListLabPartners()[0];
  return { ...base, id, ...body };
}
