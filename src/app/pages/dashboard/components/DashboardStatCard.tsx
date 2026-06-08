import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatAccent = 'pink' | 'teal' | 'amber' | 'indigo' | 'rose' | 'neutral' | 'danger';

const accentStyles: Record<StatAccent, { border: string; bg: string; value: string }> = {
  pink: {
    border: 'border-l-livotale-pink',
    bg: 'from-livotale-pink/[0.12]',
    value: 'text-livotale-pink',
  },
  teal: {
    border: 'border-l-livotale-teal',
    bg: 'from-livotale-teal/[0.12]',
    value: 'text-livotale-teal',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'from-amber-500/10',
    value: 'text-amber-600',
  },
  indigo: {
    border: 'border-l-indigo-500',
    bg: 'from-indigo-500/10',
    value: 'text-indigo-600',
  },
  rose: {
    border: 'border-l-rose-500',
    bg: 'from-rose-500/10',
    value: 'text-rose-600',
  },
  neutral: {
    border: 'border-l-border',
    bg: 'from-muted/40',
    value: 'text-foreground',
  },
  danger: {
    border: 'border-l-destructive',
    bg: 'from-destructive/10',
    value: 'text-destructive',
  },
};

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  accent?: StatAccent;
  isLoading?: boolean;
}

export function DashboardStatCard({
  label,
  value,
  accent = 'neutral',
  isLoading,
}: DashboardStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-[3px] bg-gradient-to-br to-transparent shadow-sm transition-all hover:shadow-md',
        styles.border,
        styles.bg,
      )}
    >
      <CardContent className="flex min-h-[5.75rem] flex-col items-start justify-center gap-2 p-4 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-[1.65rem]',
            styles.value,
            isLoading && 'animate-pulse opacity-60',
          )}
        >
          {isLoading ? '…' : value}
        </p>
      </CardContent>
    </Card>
  );
}
