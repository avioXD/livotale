import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComorbidityChecklist } from '@/app/pages/shared/components/ComorbidityChecklist';
import type { PatientSex, ScanPatientIntakeInput } from '@/types/scanPatientIntake';

interface PatientIntakeFormProps {
  value: ScanPatientIntakeInput;
  onChange: (value: ScanPatientIntakeInput) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function PatientIntakeForm({ value, onChange, disabled, idPrefix = 'intake' }: PatientIntakeFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-name`}>Name of patient</Label>
          <Input
            id={`${idPrefix}-name`}
            value={value.name}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-sex`}>Sex of patient</Label>
          <select
            id={`${idPrefix}-sex`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            value={value.sex}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, sex: e.target.value as PatientSex })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-age`}>Age of patient</Label>
          <Input
            id={`${idPrefix}-age`}
            inputMode="numeric"
            value={value.age || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, age: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-phone`}>Phone no. of patient</Label>
          <Input
            id={`${idPrefix}-phone`}
            inputMode="tel"
            value={value.phone}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-weight`}>Weight (if available)</Label>
          <Input
            id={`${idPrefix}-weight`}
            inputMode="decimal"
            placeholder="kg"
            value={value.weightKg ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, weightKg: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-height`}>Height in metres (if available)</Label>
          <Input
            id={`${idPrefix}-height`}
            inputMode="decimal"
            placeholder="e.g. 1.65"
            value={value.heightMeters ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, heightMeters: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      <ComorbidityChecklist
        value={value.comorbidities}
        onChange={(comorbidities) => onChange({ ...value, comorbidities })}
        disabled={disabled}
        readOnly={disabled}
      />
    </div>
  );
}

export function isPatientIntakeValid(input: ScanPatientIntakeInput): boolean {
  return Boolean(input.name.trim() && input.phone.trim() && input.age >= 1);
}
