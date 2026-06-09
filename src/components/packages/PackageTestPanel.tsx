import type { PackageTestCategory } from '@/types/package';
import { cn } from '@/lib/utils';

interface PackageTestPanelProps {
  categories: PackageTestCategory[];
  totalCount?: number | null;
  compact?: boolean;
  className?: string;
}

export function PackageTestPanel({ categories, totalCount, compact = false, className }: PackageTestPanelProps) {
  if (!categories.length) return null;

  const displayCategories = compact ? categories.slice(0, 3) : categories;
  const remaining = compact ? categories.length - displayCategories.length : 0;
  const label = totalCount ? `${totalCount} Tests` : 'Tests included';

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50/80',
        compact ? 'p-3' : 'p-4',
        className,
      )}
    >
      <p className={cn('font-bold text-foreground', compact ? 'text-sm' : 'text-base')}>{label}</p>
      <div className={cn('mt-3 space-y-2', compact ? 'text-xs' : 'text-sm')}>
        {displayCategories.map((category) => (
          <div key={category.id} className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-3 gap-y-1">
            <span className="font-semibold uppercase tracking-wide text-foreground">{category.name}</span>
            <span className="text-muted-foreground">{category.tests.join(', ')}</span>
          </div>
        ))}
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">+ {remaining} more categories</p>
        )}
      </div>
    </div>
  );
}
