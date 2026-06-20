import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ComorbidityFlags } from '@/types/scanPatientIntake';
import { cn } from '@/utils';

const ITEMS: { key: keyof ComorbidityFlags; label: string }[] = [
  { key: 'bloodPressure', label: 'Blood pressure' },
  { key: 'sugar', label: 'Sugar (diabetes)' },
  { key: 'thyroid', label: 'Thyroid' },
];

interface ComorbidityChecklistProps {
  value: ComorbidityFlags;
  onChange: (value: ComorbidityFlags) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ComorbidityChecklist({ value, onChange, disabled, readOnly }: ComorbidityChecklistProps) {
  if (readOnly) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Comorbidities</Label>
        <ul className="space-y-1 text-sm">
          {ITEMS.map((item) => (
            <li key={item.key}>
              {item.label}: <span className="font-medium">{value[item.key] ? 'Yes' : 'No'}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Comorbidities</Label>
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        >
          <span className="text-sm">{item.label}</span>
          <div className="flex gap-1">
            {(['yes', 'no'] as const).map((option) => {
              const isYes = option === 'yes';
              const selected = value[item.key] === isYes;
              return (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  disabled={disabled}
                  className={cn('h-8 min-w-14 capitalize', selected && 'pointer-events-none')}
                  onClick={() => onChange({ ...value, [item.key]: isYes })}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
