import { Button } from '@/components/ui/button';
import type { AnalyticsPeriod } from '@/services/opsAnalytics';

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

interface AnalyticsPeriodToolbarProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  className?: string;
}

export function AnalyticsPeriodToolbar({ period, onPeriodChange, className }: AnalyticsPeriodToolbarProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={period === p.value ? 'default' : 'outline'}
          onClick={() => onPeriodChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
