import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientPortalService, slotService } from '@/services/liverCare';
import {
  buildScanScheduledAt,
  defaultEditableScanDate,
  FIBROSCAN_VISIT_LABEL,
  FIBROSCAN_VISIT_MODE,
  formatScanVisitSummary,
  getScanTimeSlots,
  isPaymentReadyForScan,
  normalizeSlotCode,
} from '@/services/liverCare/scanSchedule';
import { formatTimeSlotDisplay } from '@/services/liverCare/appointmentSlots';
import type { LiverCareOrder } from '@/types/serviceOrder';

interface PatientScanScheduleSectionProps {
  order: LiverCareOrder;
  phone: string;
  onUpdated: (order: LiverCareOrder) => void;
}

export function PatientScanScheduleSection({ order, phone, onUpdated }: PatientScanScheduleSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditableScanDate(order));
  const [slotCode, setSlotCode] = useState(normalizeSlotCode(order.scanTimeSlot));
  const [slotLabel, setSlotLabel] = useState(formatTimeSlotDisplay(order.scanTimeSlot));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [apiSlots, setApiSlots] = useState<TimeSlotOption[]>([]);

  const paymentReady = isPaymentReadyForScan(order);
  const canSubmit =
    paymentReady &&
    !order.scanScheduledAt &&
    !['scan_in_progress', 'scan_completed', 'completed', 'cancelled'].includes(order.orderStatus);

  const fallbackSlots = useMemo(
    () => (canSubmit ? getScanTimeSlots(scheduleDate) : []),
    [canSubmit, scheduleDate],
  );

  const slots = apiSlots.length > 0 ? apiSlots : fallbackSlots;

  useEffect(() => {
    if (!canSubmit || !scheduleDate) {
      setApiSlots([]);
      return;
    }
    void slotService
      .listPublicScanSlots(scheduleDate)
      .then((rows) =>
        setApiSlots(
          rows.map((s) => ({
            code: s.code,
            label: s.label,
            available: s.available,
            scheduledAt: s.scheduledAt,
          })),
        ),
      )
      .catch(() => setApiSlots([]));
  }, [canSubmit, scheduleDate]);

  useEffect(() => {
    setScheduleDate(defaultEditableScanDate(order));
    setSlotCode(normalizeSlotCode(order.scanTimeSlot));
    setSlotLabel(formatTimeSlotDisplay(order.scanTimeSlot));
  }, [order.id, order.scanPatientPreferredAt, order.scanTimeSlot, order.scanScheduledAt]);

  const handleSubmit = async () => {
    if (!slotCode) {
      setError('Select a time slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const preferredAt = buildScanScheduledAt(scheduleDate, slotCode);
      const updated = await patientPortalService.requestScanDate(phone, order.id, {
        preferredAt,
        visitMode: FIBROSCAN_VISIT_MODE,
        timeSlot: slotLabel || slotCode,
      });
      onUpdated(updated);
      setSuccess(
        'Preferred home visit time submitted. Operations will assign a technician and confirm your appointment.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferred date');
    } finally {
      setSubmitting(false);
    }
  };

  if (order.orderStatus === 'cancelled') return null;

  return (
    <Card id="patient-scan-schedule">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Schedule your home FibroScan visit</CardTitle>
        <CardDescription>
          FibroScan is home-visit only — pick your preferred date and time online after payment. A technician
          will visit your registered address; our operations team assigns the field technician after you submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        {order.scanScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Your home visit is confirmed</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
            {order.technicianName && (
              <p className="mt-1 text-xs">Technician: {order.technicianName}</p>
            )}
          </div>
        ) : order.scanPatientPreferredAt ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Preferred date submitted</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
            <p className="mt-1 text-xs">Waiting for operations to assign a technician and confirm.</p>
          </div>
        ) : null}

        {!paymentReady && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Complete payment first to book your home visit online.
          </p>
        )}

        {canSubmit && (
          <>
            {order.visitLocation?.isComplete ? (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visit address</p>
                <p className="mt-1 font-medium">{order.visitLocation.address}</p>
                {(order.visitLocation.city || order.visitLocation.pincode) && (
                  <p className="text-xs text-muted-foreground">
                    {[order.visitLocation.city, order.visitLocation.pincode].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                Our team will contact you to confirm your home address before the visit.
              </p>
            )}

            <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{FIBROSCAN_VISIT_LABEL}</span> at your registered
              address. Fasting 3 hours before the scan is recommended. Clinic walk-in is not available.
            </p>

            <div className="space-y-1">
              <Label htmlFor="patient-scan-date">Preferred home visit date</Label>
              <Input
                id="patient-scan-date"
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
              <Label>Preferred time slot (45 min)</Label>
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
              You cannot choose a technician. Operations assigns the field technician after your date is submitted.
            </div>

            <Button disabled={submitting || !slotCode} onClick={() => void handleSubmit()}>
              {submitting ? 'Submitting…' : order.scanPatientPreferredAt ? 'Update preferred date' : 'Submit preferred date'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
