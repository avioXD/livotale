import { cn } from '@/lib/utils';
import type { TimeSlotOption } from '@/types';

interface TimeSlotGridProps {
  slots: TimeSlotOption[];
  selectedCode: string;
  isLoading?: boolean;
  onSelect: (code: string, label: string) => void;
  emptyMessage?: string;
}

export function TimeSlotGrid({
  slots,
  selectedCode,
  isLoading,
  onSelect,
  emptyMessage = 'No slots on this date. Try another day.',
}: TimeSlotGridProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading available slots…</p>;
  }

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const selected = selectedCode === slot.code;
        const disabled = !slot.available;
        const booked = slot.booked || disabled;

        return (
          <button
            key={slot.code}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onSelect(slot.code, slot.label);
            }}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors',
              selected && !disabled && 'border-livotale-pink bg-livotale-pink/10 text-livotale-pink',
              !selected && !disabled && 'hover:border-livotale-pink/40 hover:bg-muted/50',
              booked && 'cursor-not-allowed border-dashed bg-muted/30 text-muted-foreground opacity-60',
            )}
          >
            {slot.label}
            {booked && !slot.available && (
              <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-wide">Booked</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
