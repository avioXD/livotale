import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { liverCareOrderService } from '@/services/liverCare';
import type { AssignableTechnician } from '@/services/liverCare/OrderService';
import type { ScanTimeSlotOption } from '@/services/liverCare/SlotService';
import {
  canOpsConfirmScanSchedule,
  composeScanDateTime,
  defaultEditableScanDate,
  FIBROSCAN_VISIT_LABEL,
  FIBROSCAN_VISIT_MODE,
  formatScanVisitSummary,
  getScanSchedulePrerequisites,
  getScanTimeSlots,
  isPaymentReadyForScan,
  normalizeSlotCode,
} from '@/services/liverCare/scanSchedule';
import { formatTimeSlotDisplay } from '@/services/liverCare/appointmentSlots';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { TimeSlotOption } from '@/types';
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

function toTimeSlotOptions(slots: ScanTimeSlotOption[]): TimeSlotOption[] {
  return slots.map((s) => ({
    code: s.code,
    label: s.label,
    available: s.available,
    scheduledAt: s.scheduledAt,
  }));
}

export function OrderScanScheduleSection({ order, onUpdated, readOnly = false }: OrderScanScheduleSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditableScanDate(order));
  const [slotCode, setSlotCode] = useState(normalizeSlotCode(order.scanTimeSlot));
  const [slotLabel, setSlotLabel] = useState(formatTimeSlotDisplay(order.scanTimeSlot));
  const [scheduledAtIso, setScheduledAtIso] = useState<string | null>(null);
  const [apiSlots, setApiSlots] = useState<ScanTimeSlotOption[]>([]);
  const [technicians, setTechnicians] = useState<AssignableTechnician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    !readOnly &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'completed' &&
    !['scan_in_progress', 'scan_completed'].includes(order.orderStatus);

  const fallbackSlots = useMemo(
    () => (canEdit ? getScanTimeSlots(scheduleDate) : []),
    [canEdit, scheduleDate],
  );

  const slots = apiSlots.length > 0 ? toTimeSlotOptions(apiSlots) : fallbackSlots;

  const draftOrder = useMemo((): LiverCareOrder => {
    const preferredAt = slotCode
      ? composeScanDateTime(scheduleDate, slotCode) ?? order.scanPatientPreferredAt ?? null
      : order.scanPatientPreferredAt ?? null;
    return {
      ...order,
      scanVisitMode: FIBROSCAN_VISIT_MODE,
      scanTimeSlot: slotCode ? slotLabel || slotCode : order.scanTimeSlot,
      scanPatientPreferredAt: preferredAt,
      scanClinicLocation: null,
      technicianId: selectedTechId || order.technicianId,
      technicianName:
        technicians.find((t) => t.id === selectedTechId)?.name ?? order.technicianName,
    };
  }, [order, slotCode, slotLabel, scheduleDate, selectedTechId, technicians]);

  const prerequisites = useMemo(
    () =>
      getScanSchedulePrerequisites(draftOrder, {
        hasAddress: order.visitLocation?.isComplete === true,
      }),
    [draftOrder, order.visitLocation?.isComplete],
  );
  const canSchedule =
    canOpsConfirmScanSchedule(draftOrder, {
      hasAddress: order.visitLocation?.isComplete === true,
    }) &&
    Boolean(slotCode) &&
    Boolean(selectedTechId) &&
    isPaymentReadyForScan(order);

  useEffect(() => {
    setScheduleDate(defaultEditableScanDate(order));
    setSlotCode(normalizeSlotCode(order.scanTimeSlot));
    setSlotLabel(formatTimeSlotDisplay(order.scanTimeSlot));
    setSelectedTechId(order.technicianId ?? '');
  }, [order.id, order.scanScheduledAt, order.scanPatientPreferredAt, order.scanTimeSlot, order.technicianId]);

  useEffect(() => {
    if (!canEdit || !scheduleDate) {
      setApiSlots([]);
      return;
    }
    setLoadingSlots(true);
    void liverCareOrderService
      .getScanSlots(order.id, scheduleDate)
      .then(setApiSlots)
      .catch(() => setApiSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [canEdit, order.id, scheduleDate]);

  useEffect(() => {
    if (!canEdit || !scheduledAtIso) {
      setTechnicians([]);
      return;
    }
    setLoadingTechs(true);
    void liverCareOrderService
      .listTechniciansForSlot(scheduledAtIso, order.id)
      .then((rows) => {
        setTechnicians(rows);
        if (rows.length === 1) setSelectedTechId(rows[0].id);
      })
      .catch(() => setTechnicians([]))
      .finally(() => setLoadingTechs(false));
  }, [canEdit, scheduledAtIso, order.id]);

  if (readOnly) {
    const readOnlyPrereqs = getScanSchedulePrerequisites(order, {
      hasAddress: order.visitLocation?.isComplete === true,
    });
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Home visit schedule</CardTitle>
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
            <p className="text-sm text-muted-foreground">No home visit scheduled.</p>
          )}

          <ul className="space-y-1.5 text-sm">
            {readOnlyPrereqs.map((item) => (
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
    const tech = technicians.find((t) => t.id === selectedTechId);
    if (!slotCode || !tech || !scheduledAtIso) {
      setError('Select a time slot and available technician.');
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      await liverCareOrderService.confirmScanSchedule(order.id, {
        scheduledAt: scheduledAtIso,
        visitMode: FIBROSCAN_VISIT_MODE,
        timeSlot: slotLabel || slotCode,
        technicianId: tech.id,
        technicianName: tech.name,
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
        <CardTitle className="text-base">Home visit schedule</CardTitle>
        <CardDescription>
          Review patient preference, confirm a 45-minute slot, and assign an available field technician in one step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {order.scanPatientPreferredAt && !order.scanScheduledAt && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Patient preferred slot</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
          </div>
        )}

        {order.scanScheduledAt ? (
          <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-900">
            <p className="font-medium">Confirmed schedule</p>
            <p className="mt-1">{formatScanVisitSummary(order)}</p>
            {order.technicianName && (
              <p className="mt-1 text-xs">Technician: {order.technicianName}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No home visit confirmed yet.</p>
        )}

        <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{FIBROSCAN_VISIT_LABEL}</span>
          {order.visitLocation?.isComplete && order.visitLocation.address ? (
            <>
              {' '}
              — technician visits{' '}
              <span className="text-foreground">
                {order.visitLocation.address}
                {order.visitLocation.pincode ? ` (${order.visitLocation.pincode})` : ''}
              </span>
              .
            </>
          ) : (
            <> — technician visits the patient&apos;s registered address.</>
          )}
        </p>

        {canEdit && !order.scanScheduledAt && (
          <>
            <div className="space-y-1">
              <Label htmlFor="scan-schedule-date">Home visit date</Label>
              <Input
                id="scan-schedule-date"
                type="date"
                value={scheduleDate}
                min={tomorrowIso()}
                onChange={(e) => {
                  setScheduleDate(e.target.value);
                  setSlotCode('');
                  setSlotLabel('');
                  setScheduledAtIso(null);
                  setSelectedTechId('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Time slot (45 min)</Label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">Loading slots…</p>
              ) : (
                <TimeSlotGrid
                  slots={slots}
                  selectedCode={slotCode}
                  onSelect={(code, label) => {
                    setSlotCode(code);
                    setSlotLabel(label);
                    const match = apiSlots.find((s) => s.code === code);
                    setScheduledAtIso(match?.scheduledAt ?? composeScanDateTime(scheduleDate, code));
                    setSelectedTechId('');
                  }}
                  emptyMessage="No slots on this date. Try another day."
                />
              )}
            </div>

            {slotCode && (
              <div className="space-y-2">
                <Label htmlFor="scan-technician">Available technician for this slot</Label>
                {loadingTechs ? (
                  <p className="text-sm text-muted-foreground">Loading technicians…</p>
                ) : technicians.length === 0 ? (
                  <p className="text-sm text-amber-700">No technicians available for this slot.</p>
                ) : (
                  <Select
                    value={selectedTechId || undefined}
                    onValueChange={setSelectedTechId}
                  >
                    <SelectTrigger id="scan-technician">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name} · {tech.zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
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
            {scheduling ? 'Confirming…' : 'Confirm home visit schedule'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
