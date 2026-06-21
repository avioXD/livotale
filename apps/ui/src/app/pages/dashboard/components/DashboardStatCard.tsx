import { KpiCard, type KpiAccent } from '@/components/common/KpiCard';

type StatAccent = KpiAccent;

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  accent?: StatAccent;
  isLoading?: boolean;
  hint?: string;
  href?: string;
}

export function DashboardStatCard({
  label,
  value,
  accent = 'neutral',
  isLoading,
  hint,
  href,
}: DashboardStatCardProps) {
  return (
    <KpiCard
      label={label}
      value={value}
      accent={accent}
      isLoading={isLoading}
      hint={hint}
      href={href}
    />
  );
}
