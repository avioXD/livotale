import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import type { TimeSlotOption } from '@/types';

interface DateSlotStepProps {
  date: string;
  timeSlot: string;
  slots: TimeSlotOption[];
  isLoading?: boolean;
  onDateChange: (date: string) => void;
  onTimeSlotChange: (code: string, label?: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DateSlotStep({
  date,
  timeSlot,
  slots,
  isLoading,
  onDateChange,
  onTimeSlotChange,
  onBack,
  onNext,
}: DateSlotStepProps) {
  const selected = slots.find((s) => s.code === timeSlot);
  const canContinue = Boolean(date && timeSlot && selected?.available);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick date and time</CardTitle>
        <CardDescription>Tap an available slot to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="appt-date">Date</Label>
          <Input
            id="appt-date"
            type="date"
            min={tomorrowIso()}
            value={date}
            onChange={(e) => {
              onTimeSlotChange('');
              onDateChange(e.target.value);
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Available times</Label>
          {date ? (
            <TimeSlotGrid
              slots={slots}
              selectedCode={timeSlot}
              isLoading={isLoading}
              onSelect={(code) => onTimeSlotChange(code)}
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
