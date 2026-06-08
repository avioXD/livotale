import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Textarea } from '@/components/ui/textarea';
import { availableModes, tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { TimeSlotGrid } from '@/app/pages/appointments/wizard/TimeSlotGrid';
import { adminAppointmentsService } from '@/services';
import type {
  AdminWalkInBookResult,
  AppointmentTypeOption,
  AppointmentVisitMode,
  DoctorAvailabilityCalendar,
  DoctorOption,
  TimeSlotOption,
} from '@/types';

type AdminBookStep = 'patient' | 'type' | 'doctor' | 'schedule' | 'confirm';

const STEP_ORDER: AdminBookStep[] = ['patient', 'type', 'doctor', 'schedule', 'confirm'];

const STEP_LABELS: Record<AdminBookStep, string> = {
  patient: 'Patient',
  type: 'Service',
  doctor: 'Doctor',
  schedule: 'Schedule',
  confirm: 'Confirm',
};

function modeLabel(mode: AppointmentVisitMode | null) {
  if (mode === 'home') return 'Home visit';
  if (mode === 'clinic') return 'Clinic';
  if (mode === 'tele') return 'Teleconsultation';
  return '—';
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AdminBookAppointmentPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [pincode, setPincode] = useState('');

  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentTypeOption | null>(null);
  const [visitMode, setVisitMode] = useState<AppointmentVisitMode | null>(null);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [calendar, setCalendar] = useState<DoctorAvailabilityCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState(tomorrowIso());
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotId, setSlotId] = useState('');
  const [slotLabel, setSlotLabel] = useState('');

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<AdminWalkInBookResult | null>(null);

  const currentStep = STEP_ORDER[stepIndex] ?? 'patient';
  const modes = useMemo(
    () => (selectedType ? availableModes(selectedType) : []),
    [selectedType],
  );

  useEffect(() => {
    void adminAppointmentsService.listAppointmentTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    if (currentStep !== 'doctor' && currentStep !== 'schedule') return;
    setIsLoading(true);
    void adminAppointmentsService
      .listDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setIsLoading(false));
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 'schedule' || !selectedDoctor) return;
    const fromDate = tomorrowIso();
    const toDate = addDays(fromDate, 13);
    setIsLoading(true);
    void adminAppointmentsService
      .getDoctorAvailability(selectedDoctor.id, { fromDate, toDate })
      .then(setCalendar)
      .catch(() => setCalendar(null))
      .finally(() => setIsLoading(false));
  }, [currentStep, selectedDoctor]);

  useEffect(() => {
    if (currentStep !== 'schedule' || !selectedDoctor || !selectedDate || !visitMode) return;
    setIsLoading(true);
    void adminAppointmentsService
      .listDoctorSlots(selectedDoctor.id, selectedDate, visitMode)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setIsLoading(false));
  }, [currentStep, selectedDoctor, selectedDate, visitMode]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const canContinuePatient = fullName.trim().length >= 2 && mobile.trim().length >= 10;
  const canContinueType = Boolean(selectedType && visitMode);
  const canContinueDoctor = Boolean(selectedDoctor);
  const canContinueSchedule = Boolean(selectedDate && slotId && slots.find((s) => s.code === slotId)?.available);

  const handleBook = async () => {
    if (!selectedType || !visitMode || !selectedDoctor || !slotId) return;
    setIsSaving(true);
    setError(null);
    try {
      const booked = await adminAppointmentsService.walkInBook({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        pincode: pincode.trim() || undefined,
        typeCode: selectedType.code,
        visitMode,
        slotId,
        chiefComplaint: chiefComplaint.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(booked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setIsSaving(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader title="Appointment booked" description="Walk-in patient and slot confirmed." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiCheck className="h-5 w-5 text-green-600" />
              {result.appointment.appointmentCode}
            </CardTitle>
            <CardDescription>
              {result.patient.fullName}
              {result.patient.created ? ' · New account created' : ' · Existing patient matched'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">When: </span>
              {new Date(result.appointment.scheduledAt).toLocaleString()}
            </p>
            <p>
              <span className="text-muted-foreground">Type: </span>
              {result.appointment.typeName} ({modeLabel(result.appointment.visitMode)})
            </p>
            {result.patient.created && result.patient.temporaryPassword && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="font-medium">Temporary password</p>
                <p className="mt-1 font-mono">{result.patient.temporaryPassword}</p>
                <p className="mt-1 text-xs text-muted-foreground">Share with the patient for first login.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link to={`/appointments/${result.appointment.id}`}>View appointment</Link>
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/appointments/book')}>
                Book another
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/patients">Patients</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Book walk-in appointment"
        description={`Step ${stepIndex + 1} of ${STEP_ORDER.length}: ${STEP_LABELS[currentStep]}`}
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/admin/operations">
              <FiArrowLeft className="h-4 w-4" />
              Ops dashboard
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {currentStep === 'patient' && (
        <Card>
          <CardHeader>
            <CardTitle>Patient details</CardTitle>
            <CardDescription>
              Enter walk-in details. An account is created automatically if the mobile number is new.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="walkin-name">Full name</Label>
                <Input id="walkin-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="walkin-mobile">Mobile</Label>
                <Input
                  id="walkin-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91…"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="walkin-email">Email (optional)</Label>
                <Input id="walkin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="walkin-address">Address (optional)</Label>
                <Input id="walkin-address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="walkin-pincode">Pincode</Label>
                <Input id="walkin-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" disabled={!canContinuePatient} onClick={goNext}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 'type' && (
        <Card>
          <CardHeader>
            <CardTitle>Service & visit mode</CardTitle>
            <CardDescription>Doctor-required types use 30-minute calendar slots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Appointment type</Label>
              <div className="space-y-2">
                {types
                  .filter((t) => t.requiresDoctor)
                  .map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(type);
                        setVisitMode(null);
                        setSelectedDoctor(null);
                        setSlotId('');
                      }}
                      className={`w-full rounded-lg border p-3 text-left ${
                        selectedType?.id === type.id ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">{type.durationMinutes} min</p>
                    </button>
                  ))}
              </div>
            </div>
            {selectedType && (
              <div className="space-y-2">
                <Label>Visit mode</Label>
                <Select
                  value={visitMode ?? ''}
                  onValueChange={(v) => {
                    setVisitMode(v as AppointmentVisitMode);
                    setSlotId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {modes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {modeLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>
                Back
              </Button>
              <Button className="flex-1" disabled={!canContinueType} onClick={goNext}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'doctor' && (
        <Card>
          <CardHeader>
            <CardTitle>Select doctor</CardTitle>
            <CardDescription>Choose from active doctors with availability rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading doctors…</p>}
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => {
                  setSelectedDoctor(doctor);
                  setSlotId('');
                }}
                className={`w-full rounded-lg border p-4 text-left ${
                  selectedDoctor?.id === doctor.id ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
                }`}
              >
                <p className="font-medium">{doctor.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {doctor.specialization ?? 'General'}
                  {doctor.clinicName ? ` · ${doctor.clinicName}` : ''}
                </p>
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>
                Back
              </Button>
              <Button className="flex-1" disabled={!canContinueDoctor} onClick={goNext}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'schedule' && selectedDoctor && (
        <Card>
          <CardHeader>
            <CardTitle>Availability calendar</CardTitle>
            <CardDescription>
              30-minute slots for {selectedDoctor.fullName}. Tap a day, then pick a time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calendar && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {calendar.days.map((day) => {
                  const selected = selectedDate === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.date);
                        setSlotId('');
                      }}
                      className={`rounded-lg border p-3 text-left text-sm ${
                        selected ? 'border-livotale-pink bg-livotale-pink/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {day.available_slots} / {day.total_slots} open
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {calendar?.appointments.length ? (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Existing bookings in range</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {calendar.appointments.slice(0, 5).map((appt) => (
                    <li key={appt.id}>
                      {new Date(appt.scheduledStart).toLocaleString()} · {appt.patientName} ·{' '}
                      <Badge variant="outline" className="ml-1 capitalize">
                        {appt.status.replace(/_/g, ' ')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="admin-slot-date">Or pick a date</Label>
              <Input
                id="admin-slot-date"
                type="date"
                min={tomorrowIso()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSlotId('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Available times</Label>
              <TimeSlotGrid
                slots={slots}
                selectedCode={slotId}
                isLoading={isLoading}
                onSelect={(code, label) => {
                  setSlotId(code);
                  setSlotLabel(label);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chief-complaint">Chief complaint</Label>
              <Textarea
                id="chief-complaint"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (optional)</Label>
              <Input id="symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Notes (optional)</Label>
              <Textarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack}>
                Back
              </Button>
              <Button className="flex-1" disabled={!canContinueSchedule} onClick={goNext}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'confirm' && selectedType && selectedDoctor && visitMode && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm booking</CardTitle>
            <CardDescription>Creates or matches patient account and reserves the doctor slot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="text-right font-medium">{fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd className="text-right">{mobile}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Service</dt>
                <dd className="text-right font-medium">{selectedType.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="text-right">{modeLabel(visitMode)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Doctor</dt>
                <dd className="text-right font-medium">{selectedDoctor.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right font-medium">
                  {selectedDate}
                  {slotLabel ? ` · ${slotLabel}` : ''}
                </dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goBack} disabled={isSaving}>
                Back
              </Button>
              <Button className="flex-1" disabled={isSaving} onClick={() => void handleBook()}>
                {isSaving ? 'Booking…' : 'Confirm & book'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
