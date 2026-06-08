import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientPortalService } from '@/services/liverCare';
import {
  buildScanScheduledAt,
  defaultEditableScanDate,
  formatScanVisitSummary,
  getScanTimeSlots,
  isPaymentReadyForScan,
  normalizeSlotCode,
  SCAN_VISIT_MODE_LABELS,
} from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder, ScanVisitMode } from '@/types/serviceOrder';

interface PatientScanScheduleSectionProps {
  order: LiverCareOrder;
  phone: string;
  onUpdated: (order: LiverCareOrder) => void;
}

export function PatientScanScheduleSection({ order, phone, onUpdated }: PatientScanScheduleSectionProps) {
  const [visitMode, setVisitMode] = useState<ScanVisitMode>(order.scanVisitMode ?? 'home');
  const [scheduleDate, setScheduleDate] = useState(defaultEditableScanDate(order));
  const [slotCode, setSlotCode] = useState(normalizeSlotCode(order.scanTimeSlot));
  const [slotLabel, setSlotLabel] = useState(order.scanTimeSlot ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paymentReady = isPaymentReadyForScan(order);
  const canSubmit =
    paymentReady &&
    !order.scanScheduledAt &&
    !['scan_in_progress', 'scan_completed', 'completed', 'cancelled'].includes(order.orderStatus);

  const slots = useMemo(
    () => (canSubmit ? getScanTimeSlots(scheduleDate, visitMode) : []),
    [canSubmit, scheduleDate, visitMode],
  );

  useEffect(() => {
    setVisitMode(order.scanVisitMode ?? 'home');
    setScheduleDate(defaultEditableScanDate(order));
    setSlotCode(normalizeSlotCode(order.scanTimeSlot));
    setSlotLabel(order.scanTimeSlot ?? '');
  }, [order.id, order.scanPatientPreferredAt, order.scanVisitMode, order.scanTimeSlot, order.scanScheduledAt]);

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
        visitMode,
        timeSlot: slotLabel || slotCode,
      });
      onUpdated(updated);
      setSuccess('Preferred scan date submitted. Operations will assign a technician and confirm your appointment.');
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
        <CardTitle className="text-base">Schedule your fibrosis scan</CardTitle>
        <CardDescription>
          Choose a clinic or home visit and pick your preferred date. A technician will be assigned by our operations
          team after you submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        {order.scanScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Your scan is confirmed</p>
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
            Complete payment first to select your scan date.
          </p>
        )}

        {canSubmit && (
          <>
            <div className="space-y-2">
              <Label>Visit type</Label>
              <div className="flex flex-wrap gap-2">
                {(['home', 'clinic'] as ScanVisitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVisitMode(mode)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      visitMode === mode
                        ? 'border-livotale-pink bg-livotale-pink/10 text-livotale-pink'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {SCAN_VISIT_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
              {visitMode === 'home' && (
                <p className="text-xs text-muted-foreground">
                  Home visit at your registered address. Fasting 3 hours before scan is recommended.
                </p>
              )}
              {visitMode === 'clinic' && (
                <p className="text-xs text-muted-foreground">
                  Visit one of our partner clinics. Clinic location will be confirmed by operations.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="patient-scan-date">Preferred scan date</Label>
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
