import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPatientIntakeValid, PatientIntakeForm } from '@/app/pages/shared/components/PatientIntakeForm';
import { intakePhoneNeedsOtp } from '@/app/pages/shared/components/patientIntakePhoneUtils';
import { patientIntakeFromOrder } from '@/app/pages/shared/components/patientIntakeUtils';
import { applyOtpSendMeta, useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
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
  if (intake?.phoneOtpVerified && intake?.operatorPhoneVerifiedAt) return 'Phone verified by operations';
  if (intake?.operatorEnteredAt) return 'Saved by operations';
  return 'Not saved';
}

export function OrderPatientIntakePanel({ order, onUpdated, readOnly = false }: OrderPatientIntakePanelProps) {
  const [intake, setIntake] = useState<ScanPatientIntake | null>(null);
  const [form, setForm] = useState<ScanPatientIntakeInput>(patientIntakeFromOrder(order));
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, canResend, startCooldown } = useOtpResendCooldown();

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
      setOtpSent(Boolean(row.phoneOtpVerified));
    } else {
      setForm(patientIntakeFromOrder(order));
    }
  };

  useEffect(() => {
    void load();
  }, [order.id]);

  useEffect(() => {
    setOtpSent(false);
    setOtp('');
  }, [form.phone]);

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
  const phoneNeedsOtp = intakePhoneNeedsOtp(intake, form.phone);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Patient details (operator)</CardTitle>
          <Badge variant="outline">{intakeStatusLabel(intake)}</Badge>
        </div>
        <CardDescription>
          Pre-fill patient details before the home visit. Phone changes require OTP verification before the patient
          account is updated.
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

        {operatorCanEdit && phoneNeedsOtp && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-medium">Phone OTP verification</p>
            {!otpSent ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={saving || !form.phone.trim() || !canResend || !isPatientIntakeValid(form)}
                onClick={() =>
                  run(async () => {
                    const meta = await technicianOrderService.sendOperatorIntakeOtp(order.id, form.phone);
                    applyOtpSendMeta(meta, startCooldown);
                    setOtpSent(true);
                  })
                }
              >
                {canResend ? `Send OTP to ${form.phone}` : `Resend in ${remaining}s`}
              </Button>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Enter OTP{import.meta.env.DEV ? ' (demo: 123456)' : ''}
                  </Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={saving || otp.length < 4 || !isPatientIntakeValid(form)}
                  onClick={() =>
                    run(() => technicianOrderService.verifyOperatorPatientIntake(order.id, form, otp))
                  }
                >
                  Verify & save
                </Button>
              </div>
            )}
            {otpSent && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                disabled={saving || !canResend}
                onClick={() =>
                  run(async () => {
                    const meta = await technicianOrderService.sendOperatorIntakeOtp(order.id, form.phone);
                    applyOtpSendMeta(meta, startCooldown);
                  })
                }
              >
                {canResend ? 'Resend OTP' : `Resend in ${remaining}s`}
              </Button>
            )}
          </div>
        )}

        {operatorCanEdit && !phoneNeedsOtp && (
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
