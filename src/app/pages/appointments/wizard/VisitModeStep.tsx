import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppointmentVisitMode } from '@/types';
import { availableModes } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import type { AppointmentTypeOption } from '@/types';

interface VisitModeStepProps {
  type: AppointmentTypeOption;
  selected: AppointmentVisitMode | null;
  onSelect: (mode: AppointmentVisitMode) => void;
  onBack: () => void;
  onNext: () => void;
}

const MODE_LABELS: Record<AppointmentVisitMode, { title: string; description: string }> = {
  home: { title: 'Home visit', description: 'Technician visits your address for sample collection or Liver Fibrosis Scan.' },
  clinic: { title: 'Clinic visit', description: 'Visit a LIVGASTRO clinic at your chosen time.' },
  tele: { title: 'Teleconsultation', description: 'Online video consultation with your care team.' },
};

export function VisitModeStep({ type, selected, onSelect, onBack, onNext }: VisitModeStepProps) {
  const modes = availableModes(type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>How would you like to visit?</CardTitle>
        <CardDescription>Available modes for {type.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {modes.map((mode) => {
          const meta = MODE_LABELS[mode];
          const isSelected = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                isSelected ? 'border-livotel-pink bg-livotel-pink/5' : 'hover:bg-muted/40'
              }`}
            >
              <p className="font-medium">{meta.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            </button>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1" disabled={!selected} onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
