import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AddressStep } from '@/app/pages/appointments/wizard/AddressStep';
import { ConfirmStep } from '@/app/pages/appointments/wizard/ConfirmStep';
import { DateSlotStep } from '@/app/pages/appointments/wizard/DateSlotStep';
import { DetailsStep } from '@/app/pages/appointments/wizard/DetailsStep';
import { DoctorSlotStep } from '@/app/pages/appointments/wizard/DoctorSlotStep';
import { DoctorStep } from '@/app/pages/appointments/wizard/DoctorStep';
import { PaymentStep } from '@/app/pages/appointments/wizard/PaymentStep';
import { TypeStep } from '@/app/pages/appointments/wizard/TypeStep';
import { VisitModeStep } from '@/app/pages/appointments/wizard/VisitModeStep';
import {
  INITIAL_WIZARD_STATE,
  needsDoctorSelection,
  tomorrowIso,
  wizardSteps,
  type BookingWizardState,
  type BookingWizardStep,
} from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { journeyService } from '@/services';
import { useAppointmentsStore } from '@/store';
import type { PatientAddress } from '@/types';

const STEP_LABELS: Record<BookingWizardStep, string> = {
  type: 'Type',
  mode: 'Mode',
  doctor: 'Doctor',
  datetime: 'Date & time',
  details: 'Details',
  address: 'Address',
  payment: 'Payment',
  confirm: 'Confirm',
};

export function BookAppointmentWizardPage() {
  const navigate = useNavigate();
  const types = useAppointmentsStore((s) => s.types);
  const doctors = useAppointmentsStore((s) => s.doctors);
  const slots = useAppointmentsStore((s) => s.slots);
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const loadTypes = useAppointmentsStore((s) => s.loadTypes);
  const loadDoctors = useAppointmentsStore((s) => s.loadDoctors);
  const loadSlots = useAppointmentsStore((s) => s.loadSlots);
  const loadDoctorSlots = useAppointmentsStore((s) => s.loadDoctorSlots);
  const book = useAppointmentsStore((s) => s.book);
  const clearError = useAppointmentsStore((s) => s.clearError);

  const [state, setState] = useState<BookingWizardState>({
    ...INITIAL_WIZARD_STATE,
    scheduledDate: tomorrowIso(),
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const steps = useMemo(() => wizardSteps(state), [state]);
  const currentStep = steps[stepIndex] ?? 'type';
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const useDoctorFlow = needsDoctorSelection(state.type);

  useEffect(() => {
    clearError();
    void loadTypes();
    void journeyService.listAddresses().then((rows) => {
      setAddresses(rows);
      const def =
        rows.find((a) => Boolean((a as PatientAddress & { is_default?: boolean }).is_default ?? a.isDefault))
        ?? rows[0];
      if (def) setState((s) => ({ ...s, addressId: def.id }));
    });
  }, [loadTypes, clearError]);

  useEffect(() => {
    if (currentStep !== 'doctor') return;
    setDoctorsLoading(true);
    void loadDoctors().finally(() => setDoctorsLoading(false));
  }, [currentStep, loadDoctors]);

  useEffect(() => {
    if (currentStep !== 'datetime' || !state.scheduledDate || !state.type || !state.visitMode) return;

    setSlotsLoading(true);
    const load = useDoctorFlow && state.doctor
      ? loadDoctorSlots(state.doctor.id, state.scheduledDate, state.visitMode)
      : loadSlots(state.scheduledDate, {
          typeCode: state.type.code,
          visitMode: state.visitMode,
        });

    void load.finally(() => setSlotsLoading(false));
  }, [
    currentStep,
    state.scheduledDate,
    state.type,
    state.visitMode,
    state.doctor,
    useDoctorFlow,
    loadSlots,
    loadDoctorSlots,
  ]);

  const patch = (partial: Partial<BookingWizardState>) => setState((s) => ({ ...s, ...partial }));

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const slotLabel = slots.find((s) => s.code === (useDoctorFlow ? state.slotId : state.timeSlot))?.label;
  const addressLabel = addresses.find((a) => a.id === state.addressId)?.line1;

  const handleConfirm = async () => {
    if (!state.type || !state.visitMode || !state.scheduledDate) return;
    if (useDoctorFlow && (!state.doctor || !state.slotId)) return;
    if (!useDoctorFlow && !state.timeSlot) return;

    try {
      const created = await book({
        typeCode: state.type.code,
        visitMode: state.visitMode,
        scheduledDate: state.scheduledDate,
        ...(useDoctorFlow
          ? { slotId: state.slotId, doctorId: state.doctor?.id }
          : { timeSlot: state.timeSlot }),
        addressId: state.visitMode === 'home' ? state.addressId || undefined : undefined,
        chiefComplaint: state.chiefComplaint.trim(),
        symptoms: state.symptoms.trim() || undefined,
        notes: state.notes.trim() || undefined,
      });
      navigate(`/appointments/${created.id}`, { replace: true });
    } catch {
      /* store sets error */
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Book appointment"
        description={`Step ${stepIndex + 1} of ${steps.length}: ${STEP_LABELS[currentStep]}`}
        actions={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/appointments')}>
            <FiArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />

      <Progress value={progress} className="h-2" />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {currentStep === 'type' && (
        <TypeStep
          types={types}
          selectedCode={state.type?.code ?? null}
          onSelect={(type) => patch({ type, visitMode: null, doctor: null, slotId: '', timeSlot: '' })}
          onNext={goNext}
        />
      )}

      {currentStep === 'mode' && state.type && (
        <VisitModeStep
          type={state.type}
          selected={state.visitMode}
          onSelect={(visitMode) => patch({ visitMode, doctor: null, slotId: '', timeSlot: '' })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'doctor' && (
        <DoctorStep
          doctors={doctors}
          selectedId={state.doctor?.id ?? null}
          isLoading={doctorsLoading}
          onSelect={(doctor) => patch({ doctor, slotId: '', timeSlot: '' })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'datetime' && useDoctorFlow && state.doctor && (
        <DoctorSlotStep
          doctor={state.doctor}
          date={state.scheduledDate}
          slotId={state.slotId}
          slots={slots}
          isLoading={slotsLoading}
          onDateChange={(scheduledDate) => patch({ scheduledDate, slotId: '', timeSlot: '' })}
          onSlotChange={(slotId, label) => patch({ slotId, timeSlot: label })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'datetime' && !useDoctorFlow && (
        <DateSlotStep
          date={state.scheduledDate}
          timeSlot={state.timeSlot}
          slots={slots}
          isLoading={slotsLoading}
          onDateChange={(scheduledDate) => patch({ scheduledDate, timeSlot: '' })}
          onTimeSlotChange={(timeSlot) => patch({ timeSlot })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'details' && (
        <DetailsStep
          chiefComplaint={state.chiefComplaint}
          symptoms={state.symptoms}
          notes={state.notes}
          onChiefComplaintChange={(chiefComplaint) => patch({ chiefComplaint })}
          onSymptomsChange={(symptoms) => patch({ symptoms })}
          onNotesChange={(notes) => patch({ notes })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'address' && (
        <AddressStep
          addresses={addresses}
          addressId={state.addressId}
          onAddressChange={(addressId) => patch({ addressId })}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'payment' && state.type && (
        <PaymentStep
          amount={state.type.basePrice}
          typeName={state.type.name}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 'confirm' && (
        <ConfirmStep
          state={state}
          addressLabel={addressLabel}
          slotLabel={slotLabel}
          isSaving={isSaving}
          onBack={goBack}
          onConfirm={() => void handleConfirm()}
        />
      )}
    </div>
  );
}
