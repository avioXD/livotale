import { Label } from '@/components/ui/label';
import type { ComorbidityFlags, PatientSex, ScanPatientIntake } from '@/types/scanPatientIntake';

const SEX_LABELS: Record<PatientSex, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{value || '—'}</p>
    </div>
  );
}

interface PatientIntakeSummaryProps {
  intake: Pick<
    ScanPatientIntake,
    'name' | 'sex' | 'age' | 'phone' | 'weightKg' | 'heightMeters' | 'comorbidities'
  >;
  title?: string;
}

export function PatientIntakeSummary({ intake, title }: PatientIntakeSummaryProps) {
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={intake.name} />
        <Field label="Sex" value={SEX_LABELS[intake.sex]} />
        <Field label="Age" value={`${intake.age} years`} />
        <Field label="Phone" value={intake.phone} />
        <Field label="Weight" value={intake.weightKg != null ? `${intake.weightKg} kg` : '—'} />
        <Field label="Height" value={intake.heightMeters != null ? `${intake.heightMeters} m` : '—'} />
      </div>
      <ComorbiditySummary value={intake.comorbidities} />
    </div>
  );
}

export function ComorbiditySummary({ value }: { value: ComorbidityFlags }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Comorbidities</Label>
      <ul className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <li>Blood pressure: {value.bloodPressure ? 'Yes' : 'No'}</li>
        <li>Sugar: {value.sugar ? 'Yes' : 'No'}</li>
        <li>Thyroid: {value.thyroid ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
}

interface FibroScanIntakeSummaryProps {
  intake: Pick<
    ScanPatientIntake,
    | 'devicePatientCode'
    | 'machinePatientName'
    | 'machinePatientAge'
    | 'machinePatientSex'
    | 'machinePatientPhone'
  >;
  title?: string;
}

export function FibroScanIntakeSummary({ intake, title }: FibroScanIntakeSummaryProps) {
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      <Field label="Device patient code" value={intake.devicePatientCode ?? '—'} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name on machine" value={intake.machinePatientName ?? '—'} />
        <Field
          label="Sex on machine"
          value={intake.machinePatientSex ? SEX_LABELS[intake.machinePatientSex] : '—'}
        />
        <Field
          label="Age on machine"
          value={intake.machinePatientAge != null ? `${intake.machinePatientAge} years` : '—'}
        />
        <Field label="Phone on machine" value={intake.machinePatientPhone ?? '—'} />
      </div>
    </div>
  );
}
