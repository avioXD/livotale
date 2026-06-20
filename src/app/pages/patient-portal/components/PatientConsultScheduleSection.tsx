import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientPortalService, slotService } from '@/services/liverCare';
import type { ConsultTimeSlotOption } from '@/services/liverCare/SlotService';
import {
  canPatientSubmitConsultPreference,
  defaultEditableConsultDate,
  formatConsultVisitSummary,
  TELECONSULT_VISIT_LABEL,
} from '@/services/liverCare/consultSchedule';
import { formatTimeSlotDisplay } from '@/services/liverCare/appointmentSlots';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { TimeSlotOption } from '@/types';

interface PatientConsultScheduleSectionProps {
  order: LiverCareOrder;
  phone: string;
  onUpdated: (order: LiverCareOrder) => void;
}

export function PatientConsultScheduleSection({ order, phone, onUpdated }: PatientConsultScheduleSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditableConsultDate(order));
  const [slotCode, setSlotCode] = useState('');
  const [slotLabel, setSlotLabel] = useState(formatTimeSlotDisplay(order.consultationTimeSlot));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiSlots, setApiSlots] = useState<ConsultTimeSlotOption[]>([]);

  const canSubmit = canPatientSubmitConsultPreference(order);

  const slots: TimeSlotOption[] = useMemo(
    () =>
      apiSlots.map((s) => ({
        code: s.code,
        label: s.label,
        available: s.available,
        scheduledAt: s.scheduledAt ?? undefined,
      })),
    [apiSlots],
  );

  useEffect(() => {
    if (!canSubmit || !scheduleDate) {
      setApiSlots([]);
      return;
    }
    void slotService
      .listPublicConsultSlots(scheduleDate)
      .then(setApiSlots)
      .catch(() => setApiSlots([]));
  }, [canSubmit, scheduleDate]);

  useEffect(() => {
    setScheduleDate(defaultEditableConsultDate(order));
    setSlotLabel(formatTimeSlotDisplay(order.consultationTimeSlot));
    if (order.consultationPatientPreferredAt) {
      setSlotCode(order.consultationPatientPreferredAt);
    }
  }, [order.id, order.consultationPatientPreferredAt, order.consultationTimeSlot, order.consultationScheduledAt]);

  const handleSubmit = async () => {
    const slot = slots.find((s) => s.code === slotCode);
    if (!slot?.scheduledAt) {
      setError('Select an available time slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await patientPortalService.requestConsultDate(phone, order.id, {
        preferredAt: slot.scheduledAt,
        timeSlot: slotLabel || slot.label,
      });
      onUpdated(updated);
      setSuccess(
        'Preferred teleconsult time submitted. Operations will assign a doctor and confirm your appointment.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferred date');
    } finally {
      setSubmitting(false);
    }
  };

  if (order.orderStatus === 'cancelled' || order.packageCode !== 'PKG-3') return null;
  if (!canSubmit && !order.consultationScheduledAt && !order.consultationPatientPreferredAt) return null;

  return (
    <Card id="patient-consult-schedule">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Schedule your doctor teleconsult</CardTitle>
        <CardDescription>
          Pick your preferred video consultation slot after your report is ready. Operations assigns the hepatologist
          and confirms the appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        {order.consultationScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Your teleconsult is confirmed</p>
            <p className="mt-1">{formatConsultVisitSummary(order)}</p>
            {order.doctorName && <p className="mt-1 text-xs">Doctor: {order.doctorName}</p>}
          </div>
        ) : order.consultationPatientPreferredAt ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Preferred time submitted</p>
            <p className="mt-1">{formatConsultVisitSummary(order)}</p>
            <p className="mt-1 text-xs">Waiting for operations to assign a doctor and confirm.</p>
          </div>
        ) : null}

        {canSubmit && (
          <>
            <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{TELECONSULT_VISIT_LABEL}</span> — join via the link shared
              after operations confirms.
            </p>

            <div className="space-y-1">
              <Label htmlFor="patient-consult-date">Preferred consult date</Label>
              <Input
                id="patient-consult-date"
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
              <Label>Preferred time slot</Label>
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
              You cannot choose a doctor. Operations assigns an available hepatologist for your slot.
            </div>

            <Button disabled={submitting || !slotCode} onClick={() => void handleSubmit()}>
              {submitting
                ? 'Submitting…'
                : order.consultationPatientPreferredAt
                  ? 'Update preferred time'
                  : 'Submit preferred time'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
