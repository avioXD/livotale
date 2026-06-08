import type { DashboardOverview } from '@/types';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function mockGetDashboardOverview(): DashboardOverview {
  return {
    stats: {
      activePatients: 248,
      visitsToday: 14,
      pendingPrescriptions: 6,
      highRiskPatients: 18,
    },
    charts: {
      patientsByCity: [
        { city_name: 'Mumbai', patients: 142 },
        { city_name: 'Pune', patients: 58 },
        { city_name: 'Thane', patients: 48 },
      ],
      clinicTrends: [
        { snapshot_date: daysAgo(90), avg_bmi: 27.4, avg_alt: 58, avg_liver_fibrosis_scan: 7.8 },
        { snapshot_date: daysAgo(60), avg_bmi: 27.1, avg_alt: 55, avg_liver_fibrosis_scan: 7.5 },
        { snapshot_date: daysAgo(30), avg_bmi: 26.8, avg_alt: 52, avg_liver_fibrosis_scan: 7.2 },
        { snapshot_date: daysAgo(7), avg_bmi: 26.6, avg_alt: 50, avg_liver_fibrosis_scan: 7.0 },
      ],
    },
  };
}
