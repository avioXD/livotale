import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

interface ActiveFilterBannerProps {
  labels: string[];
  onClear?: () => void;
}

export function ActiveFilterBanner({ labels, onClear }: ActiveFilterBannerProps) {
  if (labels.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
      data-testid="active-filter-banner"
    >
      <span className="text-muted-foreground">Filtered:</span>
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium ring-1 ring-border"
        >
          {label}
        </span>
      ))}
      {onClear && (
        <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2" onClick={onClear}>
          <FiX className="h-3.5 w-3.5" aria-hidden />
          Clear filters
        </Button>
      )}
    </div>
  );
}
