import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  type FieldLimitKey,
  getFieldLimit,
  isOverFieldLimit,
} from '@/utils/fieldLimits';

export type LogTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  limit: FieldLimitKey;
  label?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function LogTextarea({
  id,
  value,
  onChange,
  limit,
  label,
  placeholder,
  rows = 3,
  disabled,
  required,
  className,
}: LogTextareaProps) {
  const max = getFieldLimit(limit);
  const count = value.length;
  const overLimit = isOverFieldLimit(value, limit);
  const showCounter = count > max * 0.8;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={overLimit || undefined}
      />
      {showCounter && (
        <p
          className={cn(
            'text-xs',
            overLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {count}/{max}
        </p>
      )}
    </div>
  );
}

/** Convenience for parent forms — disable submit when any log field exceeds its limit. */
export function isLogFieldValid(value: string, limit: FieldLimitKey): boolean {
  return !isOverFieldLimit(value, limit);
}
