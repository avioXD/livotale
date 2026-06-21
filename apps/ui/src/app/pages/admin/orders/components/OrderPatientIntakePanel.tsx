import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isPatientIntakeValid, PatientIntakeForm } from '@/app/pages/shared/components/PatientIntakeForm';
import { patientIntakeFromOrder } from '@/app/pages/shared/components/patientIntakeUtils';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { ScanPatientIntake, ScanPatientIntakeInput } from '@/types/scanPatientIntake';

interface OrderPatientIntakePanelProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

function intakeStatusLabel(intake: ScanPatientIntake | null): string {
  if (intake?.technicianVerifiedAt) return 'Verified by technician';
  if (intake?.operatorEnteredAt) return 'Saved by operations';
  return 'Not saved';
}

export function OrderPatientIntakePanel({ order, onUpdated, readOnly = false }: OrderPatientIntakePanelProps) {
  const [intake, setIntake] = useState<ScanPatientIntake | null>(null);
  const [form, setForm] = useState<ScanPatientIntakeInput>(patientIntakeFromOrder(order));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const row = await technicianOrderService.getPatientIntake(order.id);
    setIntake(row);
    if (row) {
      setForm({
        name: row.name,
        sex: row.sex,
        age: row.age,
        phone: row.phone,
        weightKg: row.weightKg ?? null,
        heightMeters: row.heightMeters ?? null,
        comorbidities: row.comorbidities,
      });
    } else {
      setForm(patientIntakeFromOrder(order));
    }
  };

  useEffect(() => {
    void load();
  }, [order.id]);

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const operatorCanEdit = !readOnly;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Patient details (operator)</CardTitle>
          <Badge variant="outline">{intakeStatusLabel(intake)}</Badge>
        </div>
        <CardDescription>
          Optionally pre-fill patient details before the home visit. The technician can verify and update these at
          the location with phone OTP — no operator approval is required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <PatientIntakeForm
          idPrefix="order-intake"
          value={form}
          onChange={setForm}
          disabled={!operatorCanEdit}
        />

        {operatorCanEdit && (
          <Button
            size="sm"
            disabled={saving || !isPatientIntakeValid(form)}
            onClick={() => run(() => technicianOrderService.saveOperatorIntake(order.id, form))}
          >
            {intake?.operatorEnteredAt ? 'Update patient details' : 'Save patient details'}
          </Button>
        )}

        {intake?.technicianVerifiedAt && (
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium">Technician verified at home</p>
            <p className="text-muted-foreground">
              {new Date(intake.technicianVerifiedAt).toLocaleString()} · OTP confirmed
              {intake.devicePatientCode ? ` · Device code ${intake.devicePatientCode}` : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
