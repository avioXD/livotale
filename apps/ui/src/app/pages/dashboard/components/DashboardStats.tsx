import { DashboardStatCard } from '@/app/pages/dashboard/components/DashboardStatCard';
import type { DashboardOverview } from '@/types';

interface DashboardStatsProps {
  overview?: DashboardOverview | null;
  isLoading?: boolean;
}

export function DashboardStats({ overview, isLoading }: DashboardStatsProps) {
  const stats = overview?.stats;
  const items = [
    { label: 'Active Patients', value: stats?.activePatients ?? '—', accent: 'pink' as const },
    { label: 'Home Visits Today', value: stats?.visitsToday ?? '—', accent: 'teal' as const },
    { label: 'Prescriptions Pending', value: stats?.pendingPrescriptions ?? '—', accent: 'pink' as const },
    { label: 'High-Risk Patients', value: stats?.highRiskPatients ?? '—', accent: 'teal' as const },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((stat) => (
        <DashboardStatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          accent={stat.accent}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
