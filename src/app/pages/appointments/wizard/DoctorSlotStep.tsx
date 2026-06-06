import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import type { DoctorOption, TimeSlotOption } from '@/types';

interface DoctorSlotStepProps {
  doctor: DoctorOption;
  date: string;
  slotId: string;
  slots: TimeSlotOption[];
  isLoading?: boolean;
  onDateChange: (date: string) => void;
  onSlotChange: (slotId: string, label: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DoctorSlotStep({
  doctor,
  date,
  slotId,
  slots,
  isLoading,
  onDateChange,
  onSlotChange,
  onBack,
  onNext,
}: DoctorSlotStepProps) {
  const selected = slots.find((s) => s.code === slotId);
  const canContinue = Boolean(date && slotId && selected?.available);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick date and time</CardTitle>
        <CardDescription>
          30-minute slots for {doctor.fullName}. Tap an available time to select it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doctor-appt-date">Date</Label>
          <Input
            id="doctor-appt-date"
            type="date"
            min={tomorrowIso()}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Available times</Label>
          {date ? (
            <TimeSlotGrid
              slots={slots}
              selectedCode={slotId}
              isLoading={isLoading}
              onSelect={onSlotChange}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Choose a date first.</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1" disabled={!canContinue} onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
