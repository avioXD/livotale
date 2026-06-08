import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppointmentTypeOption } from '@/types';

interface TypeStepProps {
  types: AppointmentTypeOption[];
  selectedCode: string | null;
  onSelect: (type: AppointmentTypeOption) => void;
  onNext: () => void;
}

function formatPrice(amount: number) {
  if (amount <= 0) return 'Included';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function TypeStep({ types, selectedCode, onSelect, onNext }: TypeStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose appointment type</CardTitle>
        <CardDescription>Select the service you need. Options include home visits, clinic, and teleconsultation where available.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {types.map((type) => {
          const selected = selectedCode === type.code;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                selected ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {type.durationMinutes} min · {formatPrice(type.basePrice)}
                  </p>
                </div>
                {selected && <span className="text-xs font-semibold text-livotale-pink">Selected</span>}
              </div>
            </button>
          );
        })}
        <Button className="w-full" disabled={!selectedCode} onClick={onNext}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
