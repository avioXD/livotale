import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingWizardState } from '@/app/pages/appointments/wizard/bookingWizardTypes';

interface ConfirmStepProps {
  state: BookingWizardState;
  addressLabel?: string;
  slotLabel?: string;
  isSaving: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

function modeLabel(mode: BookingWizardState['visitMode']) {
  if (mode === 'home') return 'Home visit';
  if (mode === 'clinic') return 'Clinic visit';
  if (mode === 'tele') return 'Teleconsultation';
  return '—';
}

export function ConfirmStep({
  state,
  addressLabel,
  slotLabel,
  isSaving,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  const { type, visitMode, scheduledDate, chiefComplaint, symptoms, notes } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm booking</CardTitle>
        <CardDescription>Review your appointment before submitting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Service</dt>
            <dd className="text-right font-medium">{type?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="text-right font-medium">{modeLabel(visitMode)}</dd>
          </div>
          {state.doctor && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Doctor</dt>
              <dd className="text-right font-medium">{state.doctor.fullName}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-right font-medium">
              {scheduledDate}
              {slotLabel ? ` · ${slotLabel}` : ''}
            </dd>
          </div>
          {addressLabel && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="max-w-[60%] text-right font-medium">{addressLabel}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Chief complaint</dt>
            <dd className="max-w-[60%] text-right">{chiefComplaint}</dd>
          </div>
          {symptoms && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Symptoms</dt>
              <dd className="max-w-[60%] text-right">{symptoms}</dd>
            </div>
          )}
          {notes && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="max-w-[60%] text-right">{notes}</dd>
            </div>
          )}
          {type && type.basePrice > 0 && (
            <div className="flex justify-between gap-4 border-t pt-3">
              <dt className="text-muted-foreground">Fee</dt>
              <dd className="font-semibold">₹{type.basePrice.toLocaleString('en-IN')}</dd>
            </div>
          )}
        </dl>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={isSaving}>
            Back
          </Button>
          <Button className="flex-1" disabled={isSaving} onClick={onConfirm}>
            {isSaving ? 'Booking…' : 'Confirm booking'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
