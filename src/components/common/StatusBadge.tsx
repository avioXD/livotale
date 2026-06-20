import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatStatusLabel,
  resolveStatusBadgeVariant,
  type StatusDomain,
} from '@/utils/statusColors';

interface StatusBadgeProps {
  status: string;
  domain?: StatusDomain;
  /** Override auto-formatted status text (e.g. ORDER_STATUS_LABELS). */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, domain = 'generic', label, className }: StatusBadgeProps) {
  const variant = resolveStatusBadgeVariant(status, domain);
  const display = label ?? formatStatusLabel(status);

  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {display}
    </Badge>
  );
}
