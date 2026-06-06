import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorOption } from '@/types';

interface DoctorStepProps {
  doctors: DoctorOption[];
  selectedId: string | null;
  isLoading?: boolean;
  onSelect: (doctor: DoctorOption) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DoctorStep({
  doctors,
  selectedId,
  isLoading,
  onSelect,
  onBack,
  onNext,
}: DoctorStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a doctor</CardTitle>
        <CardDescription>
          Select the specialist for your appointment. Slots are 30 minutes based on their calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading doctors…</p>}
        {!isLoading && doctors.length === 0 && (
          <p className="text-sm text-muted-foreground">No doctors available right now.</p>
        )}
        {doctors.map((doctor) => {
          const selected = selectedId === doctor.id;
          return (
            <button
              key={doctor.id}
              type="button"
              onClick={() => onSelect(doctor)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                selected ? 'border-livotel-pink bg-livotel-pink/5' : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{doctor.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {doctor.specialization ?? 'General'}
                    {doctor.clinicName ? ` · ${doctor.clinicName}` : ''}
                  </p>
                  {doctor.qualification && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{doctor.qualification}</p>
                  )}
                </div>
                {selected && <span className="text-xs font-semibold text-livotel-pink">Selected</span>}
              </div>
            </button>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1" disabled={!selectedId} onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
