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
import { LiverCarePrescriptionPreview } from '@/app/pages/doctor/consultations/components/LiverCarePrescriptionPreview';
import { DOCTOR_LANGUAGES } from '@/app/config/doctorLanguages';
import { liverCareOrderService, prescriptionOrderService } from '@/services/liverCare';
import type { AssignableDoctor } from '@/services/liverCare/OrderService';
import type { ConsultTimeSlotOption } from '@/services/liverCare/SlotService';
import {
  canOpsConfirmConsultSchedule,
  defaultEditableConsultDate,
  formatConsultVisitSummary,
  isConsultReportReady,
} from '@/services/liverCare/consultSchedule';
import type { TimeSlotOption } from '@/types';
import type { LiverCarePrescription } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';

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

function toTimeSlotOptions(slots: ConsultTimeSlotOption[]): TimeSlotOption[] {
  return slots.map((s) => ({
    code: s.code,
    label: s.label,
    available: s.available,
    scheduledAt: s.scheduledAt ?? undefined,
  }));
}

interface OrderConsultationSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderConsultationSection({ order, onUpdated, readOnly = false }: OrderConsultationSectionProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultEditableConsultDate(order));
  const [slotCode, setSlotCode] = useState('');
  const [slotLabel, setSlotLabel] = useState('');
  const [scheduledAtIso, setScheduledAtIso] = useState<string | null>(null);
  const [apiSlots, setApiSlots] = useState<ConsultTimeSlotOption[]>([]);
  const [doctors, setDoctors] = useState<AssignableDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [languageFilter, setLanguageFilter] = useState(order.patientPreferredLanguage ?? '');
  const [scheduling, setScheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescription, setPrescription] = useState<LiverCarePrescription | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  const canEdit = canOpsConfirmConsultSchedule(order, readOnly);
  const letterheadReady = isConsultReportReady(order);

  const slots = toTimeSlotOptions(apiSlots);

  useEffect(() => {
    setLanguageFilter(order.patientPreferredLanguage ?? '');
  }, [order.patientPreferredLanguage]);

  useEffect(() => {
    setLoadingPrescription(true);
    void prescriptionOrderService
      .getForOrder(order.id)
      .then(setPrescription)
      .catch(() => setPrescription(null))
      .finally(() => setLoadingPrescription(false));
  }, [order.id, order.orderStatus, order.updatedAt]);

  useEffect(() => {
    if (!canEdit || !scheduleDate) {
      setApiSlots([]);
      return;
    }
    setLoadingSlots(true);
    void liverCareOrderService
      .getConsultSlots(order.id, scheduleDate)
      .then(setApiSlots)
      .catch(() => setApiSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [canEdit, scheduleDate, order.id]);

  useEffect(() => {
    if (!scheduledAtIso || !canEdit) {
      setDoctors([]);
      setSelectedDoctorId('');
      return;
    }
    setLoadingDoctors(true);
    void liverCareOrderService
      .listDoctorsForConsultSlot(scheduledAtIso, {
        language: languageFilter || undefined,
        orderId: order.id,
      })
      .then((rows) => {
        setDoctors(rows);
        setSelectedDoctorId((prev) => (rows.some((d) => d.id === prev) ? prev : rows[0]?.id ?? ''));
      })
      .catch(() => {
        setDoctors([]);
        setSelectedDoctorId('');
      })
      .finally(() => setLoadingDoctors(false));
  }, [scheduledAtIso, languageFilter, canEdit, order.id]);

  const handleConfirm = async () => {
    const slot = slots.find((s) => s.code === slotCode);
    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    if (!slot?.available || !slot.scheduledAt) {
      setError('Select an available consultation slot.');
      return;
    }
    if (!doctor) {
      setError('Select an available doctor for this slot.');
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      await liverCareOrderService.confirmConsultationSchedule(order.id, {
        doctorId: doctor.id,
        doctorName: doctor.name,
        scheduledAt: slot.scheduledAt,
        timeSlot: slotLabel || slot.label,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (!languageFilter) return doctors;
    return doctors.filter((d) => d.languages.some((l) => l.toLowerCase() === languageFilter.toLowerCase()));
  }, [doctors, languageFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Teleconsult schedule</CardTitle>
          <CardDescription>
            Pick a video consultation slot, then assign an available doctor in one step. Patient preferences appear
            below when submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!letterheadReady && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
              Letterhead report must be ready before consultation scheduling unlocks.
            </p>
          )}

          {order.consultationPatientPreferredAt && !order.consultationScheduledAt && (
            <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Patient preferred slot</p>
              <p className="mt-1">{formatConsultVisitSummary(order)}</p>
            </div>
          )}

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
            {order.consultationScheduledAt && <Badge variant="secondary">Video consult booked</Badge>}
          </div>

          {canEdit && letterheadReady && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <Label htmlFor="consult-slot-date">Consult date</Label>
                <Input
                  id="consult-slot-date"
                  type="date"
                  min={tomorrowIso()}
                  value={scheduleDate}
                  onChange={(e) => {
                    setScheduleDate(e.target.value);
                    setSlotCode('');
                    setScheduledAtIso(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Available teleconsult slots</Label>
                <TimeSlotGrid
                  slots={slots}
                  selectedCode={slotCode}
                  isLoading={loadingSlots}
                  onSelect={(code, label) => {
                    setSlotCode(code);
                    setSlotLabel(label);
                    const slot = slots.find((s) => s.code === code);
                    setScheduledAtIso(slot?.scheduledAt ?? null);
                  }}
                />
              </div>

              {scheduledAtIso && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="consult-doctor-language">Filter doctors by language</Label>
                    <Select
                      value={languageFilter || 'all'}
                      onValueChange={(value) => setLanguageFilter(value === 'all' ? '' : value)}
                    >
                      <SelectTrigger id="consult-doctor-language">
                        <SelectValue placeholder="All languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All languages</SelectItem>
                        {DOCTOR_LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {loadingDoctors && <p className="text-sm text-muted-foreground">Loading available doctors…</p>}

                  {!loadingDoctors && filteredDoctors.length === 0 && (
                    <p className="text-sm text-amber-700">No doctors are free for this slot. Pick another time.</p>
                  )}

                  <div className="space-y-2">
                    {filteredDoctors.map((doctor) => {
                      const selected = selectedDoctorId === doctor.id;
                      return (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => setSelectedDoctorId(doctor.id)}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selected ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <p className="font-medium">{doctor.name}</p>
                          {doctor.specialty && (
                            <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                          )}
                          {doctor.languages.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">{doctor.languages.join(', ')}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <Button
                onClick={() => void handleConfirm()}
                disabled={scheduling || !slotCode || !selectedDoctorId}
              >
                {scheduling ? 'Confirming…' : `Confirm consult${slotLabel ? ` · ${slotLabel}` : ''}`}
              </Button>
            </div>
          )}

          {order.consultationScheduledAt && (
            <p className="text-xs text-muted-foreground">
              Patient and doctor receive the video link after scheduling. Use legacy reassign endpoints if you need to
              change doctor or time after confirm.
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
            Read-only view of the doctor&apos;s prescription after the consultation.
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
