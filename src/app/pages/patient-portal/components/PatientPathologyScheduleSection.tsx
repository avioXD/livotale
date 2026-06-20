import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientPortalService } from '@/services/liverCare';
import { APPOINTMENT_SLOT_DURATION_MINUTES, formatTimeSlotDisplay } from '@/services/liverCare/appointmentSlots';
import {
  buildPathologyScheduledAt,
  defaultEditablePathologyDate,
  formatPathologyScheduleSummary,
  getPathologyTimeSlots,
  isPaymentReadyForPathology,
  normalizePathologySlotCode,
} from '@/services/liverCare/pathologySchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';

interface PatientPathologyScheduleSectionProps {
  order: LiverCareOrder;
  phone: string;
  onUpdated: (order: LiverCareOrder) => void;
}

export function PatientPathologyScheduleSection({
  order,
  phone,
  onUpdated,
}: PatientPathologyScheduleSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditablePathologyDate(order));
  const [slotCode, setSlotCode] = useState(normalizePathologySlotCode(order.pathologyTimeSlot));
  const [slotLabel, setSlotLabel] = useState(formatTimeSlotDisplay(order.pathologyTimeSlot));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paymentReady = isPaymentReadyForPathology(order);
  const canSubmit =
    paymentReady &&
    !order.pathologyScheduledAt &&
    !['completed', 'cancelled'].includes(order.orderStatus);

  const slots = useMemo(
    () => (canSubmit ? getPathologyTimeSlots(scheduleDate) : []),
    [canSubmit, scheduleDate],
  );

  useEffect(() => {
    setScheduleDate(defaultEditablePathologyDate(order));
    setSlotCode(normalizePathologySlotCode(order.pathologyTimeSlot));
    setSlotLabel(formatTimeSlotDisplay(order.pathologyTimeSlot));
  }, [
    order.id,
    order.pathologyPatientPreferredAt,
    order.pathologyTimeSlot,
    order.pathologyScheduledAt,
  ]);

  const handleSubmit = async () => {
    if (!slotCode) {
      setError('Select a time slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const preferredAt = buildPathologyScheduledAt(scheduleDate, slotCode);
      const updated = await patientPortalService.requestPathologyDate(phone, order.id, {
        preferredAt,
        timeSlot: slotLabel || slotCode,
      });
      onUpdated(updated);
      setSuccess(
        'Preferred pathology visit submitted. Our team will create the lab partner order and confirm your appointment.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferred date');
    } finally {
      setSubmitting(false);
    }
  };

  if (order.orderStatus === 'cancelled') return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Schedule your pathology test</CardTitle>
        <CardDescription>
          Pick your preferred date for blood tests at our lab partner. Each slot is{' '}
          {APPOINTMENT_SLOT_DURATION_MINUTES} minutes. Collection is done by the lab — not during your home
          scan visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        {order.pathologyScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">Your pathology visit is confirmed</p>
              {order.pathologyVisitOutcome === 'visited' && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Collector visit confirmed
                </Badge>
              )}
            </div>
            <p className="mt-1">{formatPathologyScheduleSummary(order)}</p>
          </div>
        ) : order.pathologyPatientPreferredAt ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Preferred date submitted</p>
            <p className="mt-1">{formatPathologyScheduleSummary(order)}</p>
            <p className="mt-1 text-xs">Waiting for operations to confirm with the lab partner.</p>
          </div>
        ) : null}

        {!paymentReady && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Complete payment first to select your pathology visit date.
          </p>
        )}

        {canSubmit && (
          <>
            <div className="space-y-1">
              <Label htmlFor="patient-pathology-date">Preferred visit date</Label>
              <Input
                id="patient-pathology-date"
                type="date"
                value={scheduleDate}
                min={tomorrowIso()}
                onChange={(e) => {
                  setScheduleDate(e.target.value);
                  setSlotCode('');
                  setSlotLabel('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred time slot ({APPOINTMENT_SLOT_DURATION_MINUTES} min)</Label>
              <TimeSlotGrid
                slots={slots}
                selectedCode={slotCode}
                onSelect={(code, label) => {
                  setSlotCode(code);
                  setSlotLabel(label);
                }}
              />
            </div>

            <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2 text-[10px]">
                Note
              </Badge>
              Visit the assigned lab partner at the confirmed time. Fasting may be required — check your package
              instructions.
            </div>

            <Button disabled={submitting || !slotCode} onClick={() => void handleSubmit()}>
              {submitting
                ? 'Submitting…'
                : order.pathologyPatientPreferredAt
                  ? 'Update preferred date'
                  : 'Submit preferred date'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
