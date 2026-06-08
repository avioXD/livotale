import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { liverCareOrderService } from '@/services/liverCare';
import {
  buildScanScheduledAt,
  canOpsConfirmScanSchedule,
  composeScanDateTime,
  defaultEditableScanDate,
  formatScanVisitSummary,
  getScanSchedulePrerequisites,
  getScanTimeSlots,
  isPaymentReadyForScan,
  normalizeSlotCode,
  SCAN_CLINIC_LOCATIONS,
  SCAN_VISIT_MODE_LABELS,
} from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder, ScanVisitMode } from '@/types/serviceOrder';
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

interface OrderScanScheduleSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderScanScheduleSection({ order, onUpdated, readOnly = false }: OrderScanScheduleSectionProps) {
  const [visitMode, setVisitMode] = useState<ScanVisitMode>(order.scanVisitMode ?? 'home');
  const [scheduleDate, setScheduleDate] = useState(defaultEditableScanDate(order));
  const [slotCode, setSlotCode] = useState(normalizeSlotCode(order.scanTimeSlot));
  const [slotLabel, setSlotLabel] = useState(order.scanTimeSlot ?? '');
  const [clinicLocation, setClinicLocation] = useState(
    order.scanClinicLocation ?? SCAN_CLINIC_LOCATIONS[0],
  );
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    !readOnly &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'completed' &&
    !['scan_in_progress', 'scan_completed'].includes(order.orderStatus);

  const slots = useMemo(
    () => (canEdit ? getScanTimeSlots(scheduleDate, visitMode) : []),
    [canEdit, scheduleDate, visitMode],
  );

  const draftOrder = useMemo((): LiverCareOrder => {
    const preferredAt = slotCode
      ? composeScanDateTime(scheduleDate, slotCode) ?? order.scanPatientPreferredAt ?? null
      : order.scanPatientPreferredAt ?? null;
    return {
      ...order,
      scanVisitMode: visitMode,
      scanTimeSlot: slotCode ? slotLabel || slotCode : order.scanTimeSlot,
      scanPatientPreferredAt: preferredAt,
    };
  }, [order, visitMode, slotCode, slotLabel, scheduleDate]);

  const prerequisites = useMemo(() => getScanSchedulePrerequisites(draftOrder), [draftOrder]);
  const canSchedule = canOpsConfirmScanSchedule(draftOrder) && slotCode && isPaymentReadyForScan(order);

  useEffect(() => {
    setVisitMode(order.scanVisitMode ?? 'home');
    setScheduleDate(defaultEditableScanDate(order));
    setSlotCode(normalizeSlotCode(order.scanTimeSlot));
    setSlotLabel(order.scanTimeSlot ?? '');
    setClinicLocation(order.scanClinicLocation ?? SCAN_CLINIC_LOCATIONS[0]);
  }, [order.id, order.scanScheduledAt, order.scanPatientPreferredAt, order.scanVisitMode, order.scanTimeSlot, order.scanClinicLocation]);

  if (readOnly) {
    const prerequisites = getScanSchedulePrerequisites(order);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scan schedule</CardTitle>
          <CardDescription>Completed step — schedule details are read-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.scanScheduledAt || order.scanPatientPreferredAt ? (
            <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
              <p className="font-medium">
                {order.scanScheduledAt ? 'Confirmed schedule' : 'Patient preferred date'}
              </p>
              <p className="mt-1">{formatScanVisitSummary(order)}</p>
              {order.technicianName && (
                <p className="mt-1 text-xs">Technician: {order.technicianName}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scan schedule recorded.</p>
          )}

          <ul className="space-y-1.5 text-sm">
            {prerequisites.map((item) => (
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

          {order.scanScheduledAt && (
            <p className="text-xs text-muted-foreground">
              Confirmed {formatDateTime(order.scanScheduledAt)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSchedule = async () => {
    if (!slotCode) {
      setError('Select a time slot.');
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      const scheduledAt = buildScanScheduledAt(scheduleDate, slotCode);
      await liverCareOrderService.scheduleScan(order.id, {
        scheduledAt,
        visitMode,
        timeSlot: slotLabel || slotCode,
        clinicLocation: visitMode === 'clinic' ? clinicLocation : undefined,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scan schedule</CardTitle>
        <CardDescription>
          Operations confirms date, visit type, and time slot. Patients may submit a preferred date; technician
          assignment is done separately below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {order.scanScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Confirmed schedule</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
          </div>
        ) : order.scanPatientPreferredAt ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Patient preferred date</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
            <p className="mt-1 text-xs">Assign a technician and confirm below to lock the schedule.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No scan date selected yet.</p>
        )}

        <div className="space-y-2">
          <Label>Visit type</Label>
          <div className="flex flex-wrap gap-2">
            {(['home', 'clinic'] as ScanVisitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!canEdit}
                onClick={() => setVisitMode(mode)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  visitMode === mode
                    ? 'border-livotale-pink bg-livotale-pink/10 text-livotale-pink'
                    : 'hover:bg-muted/50'
                } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {SCAN_VISIT_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          {visitMode === 'clinic' && (
            <div className="space-y-1 pt-1">
              <Label htmlFor="scan-clinic-location">Clinic location</Label>
              <select
                id="scan-clinic-location"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
                disabled={!canEdit}
              >
                {SCAN_CLINIC_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
          {visitMode === 'home' && (
            <p className="text-xs text-muted-foreground">
              Home visit uses the patient address on file. Confirm pin code is serviceable before scheduling.
            </p>
          )}
        </div>

        {canEdit && (
          <>
            <div className="space-y-1">
              <Label htmlFor="scan-schedule-date">Scan date</Label>
              <Input
                id="scan-schedule-date"
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
              <Label>Time slot</Label>
              <TimeSlotGrid
                slots={slots}
                selectedCode={slotCode}
                onSelect={(code, label) => {
                  setSlotCode(code);
                  setSlotLabel(label);
                }}
                emptyMessage="No slots on this date. Try another day or visit type."
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

        {canEdit && !order.scanScheduledAt && (
          <Button size="sm" disabled={scheduling || !canSchedule} onClick={() => void handleSchedule()}>
            {scheduling ? 'Confirming…' : 'Confirm scan schedule'}
          </Button>
        )}

      </CardContent>
    </Card>
  );
}
