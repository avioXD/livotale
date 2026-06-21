import type { IconType } from 'react-icons';
import { FiArrowUpRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KpiAccent =
  | 'pink'
  | 'teal'
  | 'amber'
  | 'indigo'
  | 'rose'
  | 'violet'
  | 'emerald'
  | 'neutral'
  | 'danger';

const accentStyles: Record<
  KpiAccent,
  { border: string; bg: string; value: string; icon: string; orb: string; hover: string }
> = {
  pink: {
    border: 'border-l-livotale-pink',
    bg: 'from-livotale-pink/[0.12]',
    value: 'text-livotale-pink',
    icon: 'text-livotale-pink',
    orb: 'bg-livotale-pink/15',
    hover: 'hover:shadow-livotale-pink/15',
  },
  teal: {
    border: 'border-l-livotale-teal',
    bg: 'from-livotale-teal/[0.12]',
    value: 'text-livotale-teal',
    icon: 'text-livotale-teal',
    orb: 'bg-livotale-teal/15',
    hover: 'hover:shadow-livotale-teal/15',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'from-amber-500/10',
    value: 'text-amber-700 dark:text-amber-400',
    icon: 'text-amber-600 dark:text-amber-400',
    orb: 'bg-amber-500/15',
    hover: 'hover:shadow-amber-500/15',
  },
  indigo: {
    border: 'border-l-indigo-500',
    bg: 'from-indigo-500/10',
    value: 'text-indigo-700 dark:text-indigo-400',
    icon: 'text-indigo-600 dark:text-indigo-400',
    orb: 'bg-indigo-500/15',
    hover: 'hover:shadow-indigo-500/15',
  },
  rose: {
    border: 'border-l-rose-500',
    bg: 'from-rose-500/10',
    value: 'text-rose-700 dark:text-rose-400',
    icon: 'text-rose-600 dark:text-rose-400',
    orb: 'bg-rose-500/15',
    hover: 'hover:shadow-rose-500/15',
  },
  violet: {
    border: 'border-l-violet-500',
    bg: 'from-violet-500/10',
    value: 'text-violet-700 dark:text-violet-400',
    icon: 'text-violet-600 dark:text-violet-400',
    orb: 'bg-violet-500/15',
    hover: 'hover:shadow-violet-500/15',
  },
  emerald: {
    border: 'border-l-emerald-500',
    bg: 'from-emerald-500/10',
    value: 'text-emerald-700 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
    orb: 'bg-emerald-500/15',
    hover: 'hover:shadow-emerald-500/15',
  },
  neutral: {
    border: 'border-l-border',
    bg: 'from-muted/50',
    value: 'text-foreground',
    icon: 'text-muted-foreground',
    orb: 'bg-muted/60',
    hover: 'hover:shadow-muted/30',
  },
  danger: {
    border: 'border-l-destructive',
    bg: 'from-destructive/10',
    value: 'text-destructive',
    icon: 'text-destructive',
    orb: 'bg-destructive/15',
    hover: 'hover:shadow-destructive/15',
  },
};

export const KPI_ACCENTS: KpiAccent[] = [
  'pink',
  'teal',
  'indigo',
  'amber',
  'rose',
  'violet',
  'emerald',
  'neutral',
];

export function kpiAccentAt(index: number): KpiAccent {
  return KPI_ACCENTS[index % KPI_ACCENTS.length];
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: KpiAccent;
  isLoading?: boolean;
  icon?: IconType;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  href,
  accent = 'neutral',
  isLoading,
  icon: Icon,
  className,
}: KpiCardProps) {
  const styles = accentStyles[accent];
  const clickable = Boolean(href);

  const card = (
    <Card
      className={cn(
        'group relative overflow-hidden border-l-[3px] bg-gradient-to-br to-card shadow-sm transition-all duration-200',
        styles.border,
        styles.bg,
        clickable && ['hover:-translate-y-0.5 hover:shadow-md', styles.hover],
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl',
          styles.orb,
        )}
      />
      <CardContent className="relative flex min-h-[6.25rem] flex-col justify-between gap-3 p-4 sm:min-h-[6.75rem] sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="pr-2 text-[11px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {Icon && <Icon className={cn('h-4 w-4', styles.icon)} aria-hidden />}
            {clickable && (
              <FiArrowUpRight
                className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            )}
          </div>
        </div>
        <div>
          <p
            className={cn(
              'text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-[1.75rem]',
              styles.value,
              isLoading && 'animate-pulse opacity-60',
            )}
          >
            {isLoading ? '…' : value}
          </p>
          {hint && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block no-underline">
        {card}
      </Link>
    );
  }
  return card;
}

export interface KpiInsightCardProps {
  label: string;
  title: string;
  accent?: KpiAccent;
  className?: string;
  children: React.ReactNode;
}

/** Rich KPI-style card for multi-line summaries (care plan, lab panel, etc.). */
export function KpiInsightCard({
  label,
  title,
  accent = 'neutral',
  className,
  children,
}: KpiInsightCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-l-[3px] bg-gradient-to-br to-card shadow-sm',
        styles.border,
        styles.bg,
        className,
      )}
    >
      <div className={cn('pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl', styles.orb)} />
      <CardContent className="relative space-y-3 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-base font-semibold leading-snug">{title}</p>
        </div>
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

export interface KpiActionCardProps {
  label: string;
  actionLabel: string;
  href: string;
  icon: IconType;
  accent?: KpiAccent;
  badge?: string | number;
  className?: string;
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(href);
}

/** Shortcut tile for dashboards (profile, notifications, downloads). */
export function KpiActionCard({
  label,
  actionLabel,
  href,
  icon: Icon,
  accent = 'pink',
  badge,
  className,
}: KpiActionCardProps) {
  const styles = accentStyles[accent];
  const wrapperClass = cn('block no-underline', className);
  const external = isExternalHref(href);

  const cardInner = (
      <Card
        className={cn(
          'group relative overflow-hidden border-l-[3px] bg-gradient-to-br to-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          styles.border,
          styles.bg,
          styles.hover,
        )}
      >
        <div className={cn('pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl', styles.orb)} />
        <CardContent className="relative flex items-center gap-4 p-4 sm:p-5">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-sm ring-1 ring-border/60',
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">
              {label}
              {badge != null && badge !== '' && (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">({badge})</span>
              )}
            </p>
            <p className={cn('mt-0.5 text-xs font-medium', styles.value)}>{actionLabel}</p>
          </div>
          <FiArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </CardContent>
      </Card>
  );

  if (external) {
    return (
      <a href={href} className={wrapperClass}>
        {cardInner}
      </a>
    );
  }

  return (
    <Link to={href} className={wrapperClass}>
      {cardInner}
    </Link>
  );
}

export function KpiGrid({
  children,
  className,
  cols = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 'default' | 'three' | 'two';
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 'three' && 'sm:grid-cols-2 xl:grid-cols-3',
        cols === 'two' && 'sm:grid-cols-2',
        cols === 'default' && 'sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
