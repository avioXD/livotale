import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pathologyService } from '@/services/liverCare';
import {
  APPOINTMENT_SLOT_DURATION_MINUTES,
  formatTimeSlotDisplay,
} from '@/services/liverCare/appointmentSlots';
import {
  buildPathologyScheduledAt,
  canOpsConfirmPathologySchedule,
  composePathologyDateTime,
  defaultEditablePathologyDate,
  formatPathologyScheduleSummary,
  getPathologySchedulePrerequisites,
  getPathologyTimeSlots,
  isPaymentReadyForPathology,
  normalizePathologySlotCode,
} from '@/services/liverCare/pathologySchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { FiCheck, FiCircle } from 'react-icons/fi';

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface OrderPathologyScheduleSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderPathologyScheduleSection({
  order,
  onUpdated,
  readOnly = false,
}: OrderPathologyScheduleSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditablePathologyDate(order));
  const [slotCode, setSlotCode] = useState(normalizePathologySlotCode(order.pathologyTimeSlot));
  const [slotLabel, setSlotLabel] = useState(formatTimeSlotDisplay(order.pathologyTimeSlot));
  const [scheduling, setScheduling] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [externalAppointmentId, setExternalAppointmentId] = useState(order.pathologyExternalAppointmentId ?? '');
  const [savingExternalId, setSavingExternalId] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    !readOnly &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'completed';

  const slots = useMemo(
    () => (canEdit ? getPathologyTimeSlots(scheduleDate) : []),
    [canEdit, scheduleDate],
  );

  const draftOrder = useMemo((): LiverCareOrder => {
    const preferredAt = slotCode
      ? composePathologyDateTime(scheduleDate, slotCode) ?? order.pathologyPatientPreferredAt ?? null
      : order.pathologyPatientPreferredAt ?? null;
    return {
      ...order,
      pathologyTimeSlot: slotCode ? slotLabel || slotCode : order.pathologyTimeSlot,
      pathologyPatientPreferredAt: preferredAt,
    };
  }, [order, slotCode, slotLabel, scheduleDate]);

  const prerequisites = useMemo(() => getPathologySchedulePrerequisites(draftOrder), [draftOrder]);
  const canSchedule =
    canOpsConfirmPathologySchedule(draftOrder) && slotCode && isPaymentReadyForPathology(order);

  useEffect(() => {
    setScheduleDate(defaultEditablePathologyDate(order));
    setSlotCode(normalizePathologySlotCode(order.pathologyTimeSlot));
    setSlotLabel(formatTimeSlotDisplay(order.pathologyTimeSlot));
    setExternalAppointmentId(order.pathologyExternalAppointmentId ?? '');
  }, [
    order.id,
    order.pathologyScheduledAt,
    order.pathologyPatientPreferredAt,
    order.pathologyTimeSlot,
    order.pathologyLabOrderRef,
    order.pathologyExternalAppointmentId,
    order.partnerLabId,
  ]);

  const handleSaveExternalId = async () => {
    const trimmed = externalAppointmentId.trim();
    if (!trimmed) {
      setError('Enter the appointment ID from the lab partner site.');
      return;
    }
    setSavingExternalId(true);
    setError(null);
    try {
      await pathologyService.updateExternalAppointment(order.id, trimmed);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save external appointment ID');
    } finally {
      setSavingExternalId(false);
    }
  };

  const handleCreateLabOrder = async () => {
    setCreatingOrder(true);
    setError(null);
    try {
      await pathologyService.createLabPartnerOrder(order.id);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create lab order');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSchedule = async () => {
    if (!slotCode) {
      setError('Select a time slot.');
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      const scheduledAt = buildPathologyScheduledAt(scheduleDate, slotCode);
      await pathologyService.schedulePathology(order.id, {
        scheduledAt,
        timeSlot: slotLabel || slotCode,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  if (readOnly) {
    const prereqs = getPathologySchedulePrerequisites(order);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pathology schedule</CardTitle>
          <CardDescription>Lab partner visit — {APPOINTMENT_SLOT_DURATION_MINUTES}-minute slots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.pathologyScheduledAt || order.pathologyPatientPreferredAt ? (
            <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
              <p className="font-medium">
                {order.pathologyScheduledAt ? 'Confirmed schedule' : 'Patient preferred date'}
              </p>
              <p className="mt-1">{formatPathologyScheduleSummary(order)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pathology schedule recorded.</p>
          )}
          <ul className="space-y-1.5 text-sm">
            {prereqs.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-muted-foreground">
                {item.met ? (
                  <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <FiCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          {order.pathologyScheduledAt && (
            <p className="text-xs text-muted-foreground">
              Confirmed {formatDateTime(order.pathologyScheduledAt)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pathology schedule</CardTitle>
        <CardDescription>
          Book the visit on the lab partner&apos;s website on behalf of the patient, save their portal order
          ID here, then confirm the visit date and {APPOINTMENT_SLOT_DURATION_MINUTES}-minute slot. Update
          visit and collection status below by checking the lab partner portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {order.pathologyScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Confirmed pathology visit</p>
            <p className="mt-1">{formatPathologyScheduleSummary(order)}</p>
          </div>
        ) : order.pathologyPatientPreferredAt ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Patient preferred date</p>
            <p className="mt-1">{formatPathologyScheduleSummary(order)}</p>
            <p className="mt-1 text-xs">Confirm lab order and lock the schedule below.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pathology date selected yet.</p>
        )}

        {order.partnerLabId && !order.pathologyLabOrderRef && (
          <div className="rounded-md border border-dashed px-3 py-3">
            <p className="text-sm font-medium">Internal Livotale order ref</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate an internal reference for {order.partnerLabName} / {order.patientName}, then create
              the real order on the lab partner&apos;s website and save their portal order ID below.
            </p>
            <Button size="sm" className="mt-2" disabled={creatingOrder} onClick={() => void handleCreateLabOrder()}>
              {creatingOrder ? 'Creating…' : 'Generate internal order ref'}
            </Button>
          </div>
        )}

        {order.pathologyLabOrderRef && (
          <div className="space-y-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <p>
              Internal ref: <span className="font-mono font-medium">{order.pathologyLabOrderRef}</span>
            </p>
            <div className="space-y-1">
              <Label htmlFor="external-appointment-id">Lab partner portal order ID</Label>
              <p className="text-xs text-muted-foreground">
                After creating the order on {order.partnerLabName ?? 'the lab partner'}&apos;s website on
                behalf of the patient, paste the order or appointment ID shown in their portal.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="external-appointment-id"
                  value={externalAppointmentId}
                  onChange={(e) => setExternalAppointmentId(e.target.value)}
                  placeholder="e.g. DR12345"
                  className="max-w-xs font-mono"
                  disabled={readOnly || Boolean(order.pathologyScheduledAt && order.pathologyVisitOutcome === 'visited')}
                />
                {canEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingExternalId || !externalAppointmentId.trim()}
                    onClick={() => void handleSaveExternalId()}
                  >
                    {savingExternalId ? 'Saving…' : 'Save portal order ID'}
                  </Button>
                )}
              </div>
              {order.pathologyExternalAppointmentId && (
                <p className="text-xs text-green-700">
                  Saved: <span className="font-mono">{order.pathologyExternalAppointmentId}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {canEdit && (
          <>
            <div className="space-y-1">
              <Label htmlFor="pathology-schedule-date">Pathology visit date</Label>
              <Input
                id="pathology-schedule-date"
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
              <Label>Time slot ({APPOINTMENT_SLOT_DURATION_MINUTES} min)</Label>
              <TimeSlotGrid
                slots={slots}
                selectedCode={slotCode}
                onSelect={(code, label) => {
                  setSlotCode(code);
                  setSlotLabel(label);
                }}
                emptyMessage="No slots on this date. Try another day."
              />
            </div>
          </>
        )}

        <div className="rounded-md border border-dashed px-3 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Requirements to confirm schedule
          </p>
          <ul className="space-y-1.5 text-sm">
            {prerequisites.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                {item.met ? (
                  <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <FiCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={item.met ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                  <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                    {item.owner}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {canEdit && !order.pathologyScheduledAt && (
          <Button size="sm" disabled={scheduling || !canSchedule} onClick={() => void handleSchedule()}>
            {scheduling ? 'Confirming…' : 'Confirm pathology schedule'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
