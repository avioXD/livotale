import { useEffect, useMemo, useState } from 'react';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiverCarePrescriptionPreview } from '@/app/pages/doctor/consultations/components/LiverCarePrescriptionPreview';
import { adminAppointmentsService } from '@/services';
import { liverCareOrderService, prescriptionOrderService } from '@/services/liverCare';
import type { DoctorAvailabilityCalendar, DoctorOption, TimeSlotOption } from '@/types';
import type { LiverCarePrescription } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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

interface AvailabilityCalendarProps {
  calendar: DoctorAvailabilityCalendar | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}

function AvailabilityCalendar({ calendar, selectedDate, onSelectDate, isLoading }: AvailabilityCalendarProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading availability…</p>;
  }
  if (!calendar?.days.length) {
    return <p className="text-sm text-muted-foreground">No availability in this range.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {calendar.days.map((day) => {
        const selected = selectedDate === day.date;
        const closed = day.total_slots === 0;
        return (
          <button
            key={day.date}
            type="button"
            disabled={closed}
            onClick={() => onSelectDate(day.date)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              selected ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
            } ${closed ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <p className="font-medium">
              {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {closed ? 'Closed' : `${day.available_slots} / ${day.total_slots} open`}
            </p>
          </button>
        );
      })}
    </div>
  );
}

interface OrderConsultationSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderConsultationSection({ order, onUpdated, readOnly = false }: OrderConsultationSectionProps) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(order.doctorId ?? '');
  const [calendar, setCalendar] = useState<DoctorAvailabilityCalendar | null>(null);
  const [scheduleCalendar, setScheduleCalendar] = useState<DoctorAvailabilityCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState(tomorrowIso());
  const [scheduleDate, setScheduleDate] = useState(tomorrowIso());
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotId, setSlotId] = useState('');
  const [slotLabel, setSlotLabel] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingScheduleCalendar, setLoadingScheduleCalendar] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescription, setPrescription] = useState<LiverCarePrescription | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId],
  );

  const assignedDoctor = useMemo(
    () => doctors.find((d) => d.id === order.doctorId) ?? null,
    [doctors, order.doctorId],
  );

  const canAssign =
    !readOnly && order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
  const canSchedule =
    !readOnly &&
    Boolean(order.doctorId) &&
    !order.consultationScheduledAt &&
    ['doctor_assigned', 'consultation_pending'].includes(order.orderStatus);

  const letterheadReady = [
    'final_report_generated',
    'doctor_assignment_pending',
    'doctor_assigned',
    'consultation_pending',
    'prescription_pending',
    'prescription_generated',
    'completed',
  ].includes(order.orderStatus);

  useEffect(() => {
    setLoadingDoctors(true);
    void adminAppointmentsService
      .listDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  useEffect(() => {
    setLoadingPrescription(true);
    void prescriptionOrderService
      .getForOrder(order.id)
      .then(setPrescription)
      .catch(() => setPrescription(null))
      .finally(() => setLoadingPrescription(false));
  }, [order.id, order.orderStatus, order.updatedAt]);

  useEffect(() => {
    setSelectedDoctorId(order.doctorId ?? '');
  }, [order.doctorId]);

  useEffect(() => {
    if (!selectedDoctorId || readOnly) {
      setCalendar(null);
      return;
    }
    const fromDate = tomorrowIso();
    const toDate = addDays(fromDate, 13);
    setLoadingCalendar(true);
    void adminAppointmentsService
      .getDoctorAvailability(selectedDoctorId, { fromDate, toDate })
      .then(setCalendar)
      .catch(() => setCalendar(null))
      .finally(() => setLoadingCalendar(false));
  }, [selectedDoctorId, readOnly]);

  useEffect(() => {
    if (!order.doctorId || readOnly) {
      setScheduleCalendar(null);
      return;
    }
    const fromDate = tomorrowIso();
    const toDate = addDays(fromDate, 13);
    setLoadingScheduleCalendar(true);
    void adminAppointmentsService
      .getDoctorAvailability(order.doctorId, { fromDate, toDate })
      .then(setScheduleCalendar)
      .catch(() => setScheduleCalendar(null))
      .finally(() => setLoadingScheduleCalendar(false));
  }, [order.doctorId, readOnly]);

  useEffect(() => {
    if (!order.doctorId || !scheduleDate || !canSchedule) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    void adminAppointmentsService
      .listDoctorSlots(order.doctorId, scheduleDate, 'tele')
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [order.doctorId, scheduleDate, canSchedule]);

  const handleAssign = async () => {
    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    if (!doctor) {
      setError('Select a doctor to assign.');
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      await liverCareOrderService.assignDoctor(order.id, doctor.id, doctor.fullName);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doctor assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleSchedule = async () => {
    const slot = slots.find((s) => s.code === slotId);
    if (!slot?.available || !slot.scheduledAt) {
      setError('Select an available consultation slot.');
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      await liverCareOrderService.scheduleConsultation(order.id, slot.scheduledAt, slot.label);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Doctor assignment</CardTitle>
          <CardDescription>
            Operations assigns the consulting hepatologist. Each doctor&apos;s teleconsult availability is shown for
            the next two weeks before you confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!letterheadReady && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
              Letterhead report must be ready before doctor assignment unlocks.
            </p>
          )}

          {order.doctorName ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Currently assigned:</span>
              <Badge variant="secondary">{order.doctorName}</Badge>
              {assignedDoctor?.specialization && (
                <span className="text-xs text-muted-foreground">{assignedDoctor.specialization}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No doctor assigned yet.</p>
          )}

          {canAssign && letterheadReady && (
            <>
              {loadingDoctors && <p className="text-sm text-muted-foreground">Loading doctors…</p>}
              <div className="space-y-2">
                {doctors.map((doctor) => {
                  const selected = selectedDoctorId === doctor.id;
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(doctor.id);
                        setSlotId('');
                      }}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selected ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-medium">{doctor.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doctor.specialization ?? 'General'}
                        {doctor.clinicName ? ` · ${doctor.clinicName}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedDoctor && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                  <div>
                    <p className="text-sm font-medium">Availability — {selectedDoctor.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      30-minute teleconsult slots · tap a day to preview open times
                    </p>
                  </div>
                  <AvailabilityCalendar
                    calendar={calendar}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSlotId('');
                    }}
                    isLoading={loadingCalendar}
                  />
                  {calendar?.weeklyRules.length ? (
                    <p className="text-xs text-muted-foreground">
                      Weekly hours:{' '}
                      {calendar.weeklyRules
                        .map(
                          (r) =>
                            `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.dayOfWeek]} ${r.startTime}–${r.endTime}`,
                        )
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              )}

              <Button
                onClick={() => void handleAssign()}
                disabled={assigning || !selectedDoctorId || selectedDoctorId === order.doctorId}
              >
                {assigning
                  ? 'Assigning…'
                  : order.doctorId
                    ? 'Reassign doctor'
                    : 'Assign doctor'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consultation slot</CardTitle>
          <CardDescription>
            Video consultation included in this package. Pick an open slot from the assigned doctor&apos;s calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Assigned doctor</span>
              <p className="font-medium">{order.doctorName ?? 'Not assigned yet'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Scheduled at</span>
              <p className="font-medium">{formatDateTime(order.consultationScheduledAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{order.orderStatus.replace(/_/g, ' ')}</Badge>
            {order.consultationScheduledAt && (
              <Badge variant="secondary">Video consult booked</Badge>
            )}
          </div>

          {canSchedule && order.doctorId && (
            <div className="space-y-4 rounded-md border p-4">
              <AvailabilityCalendar
                calendar={scheduleCalendar}
                selectedDate={scheduleDate}
                onSelectDate={(date) => {
                  setScheduleDate(date);
                  setSlotId('');
                }}
                isLoading={loadingScheduleCalendar}
              />

              <div className="space-y-2">
                <Label htmlFor="consult-slot-date">Or pick a date</Label>
                <Input
                  id="consult-slot-date"
                  type="date"
                  min={tomorrowIso()}
                  value={scheduleDate}
                  onChange={(e) => {
                    setScheduleDate(e.target.value);
                    setSlotId('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Available times (teleconsult)</Label>
                <TimeSlotGrid
                  slots={slots}
                  selectedCode={slotId}
                  isLoading={loadingSlots}
                  onSelect={(code, label) => {
                    setSlotId(code);
                    setSlotLabel(label);
                  }}
                />
              </div>

              <Button
                onClick={() => void handleSchedule()}
                disabled={scheduling || !slotId || !slots.find((s) => s.code === slotId)?.available}
              >
                {scheduling ? 'Scheduling…' : `Schedule consultation${slotLabel ? ` · ${slotLabel}` : ''}`}
              </Button>
            </div>
          )}

          {!order.doctorId && (
            <p className="text-xs text-muted-foreground">Assign a doctor above to unlock slot scheduling.</p>
          )}

          {order.consultationScheduledAt && (
            <p className="text-xs text-muted-foreground">
              Patient and doctor receive the video link after scheduling. Prescription is completed on the doctor portal
              after the consult.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Prescription</CardTitle>
            {prescription && (
              <Badge variant={prescription.status === 'published' ? 'secondary' : 'outline'} className="capitalize">
                {prescription.status}
              </Badge>
            )}
          </div>
          <CardDescription>
            Read-only view of the doctor&apos;s prescription after the consultation. Doctors author and publish Rx on
            the doctor portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPrescription && <p className="text-sm text-muted-foreground">Loading prescription…</p>}

          {!loadingPrescription && !prescription && (
            <p className="text-sm text-muted-foreground">
              No prescription yet. It will appear here once the doctor publishes it after the consultation.
            </p>
          )}

          {prescription && (
            <>
              {prescription.pdfUrl && prescription.status === 'published' && (
                <Button variant="outline" size="sm" asChild>
                  <a href={prescription.pdfUrl} target="_blank" rel="noopener noreferrer">
                    Download PDF
                  </a>
                </Button>
              )}
              <LiverCarePrescriptionPreview order={order} prescription={prescription} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
