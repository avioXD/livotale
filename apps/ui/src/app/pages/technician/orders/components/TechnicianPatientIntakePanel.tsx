import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComorbidityChecklist } from '@/app/pages/shared/components/ComorbidityChecklist';
import { patientIntakeFromOrder } from '@/app/pages/shared/components/patientIntakeUtils';
import { PatientIntakeSummary } from '@/app/pages/shared/components/PatientIntakeSummary';
import { applyOtpSendMeta, useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { PatientSex, ScanPatientIntake, ScanPatientIntakeInput } from '@/types/scanPatientIntake';

interface TechnicianPatientIntakePanelProps {
  order: LiverCareOrder;
  paymentReady: boolean;
  visitReady: boolean;
  intakeOtpSent?: boolean;
  onUpdated: () => void;
}

function defaultForm(order: LiverCareOrder, intake: ScanPatientIntake | null): ScanPatientIntakeInput {
  if (intake) {
    return {
      name: intake.name,
      sex: intake.sex,
      age: intake.age,
      phone: intake.phone,
      weightKg: intake.weightKg ?? null,
      heightMeters: intake.heightMeters ?? null,
      comorbidities: intake.comorbidities,
    };
  }
  return patientIntakeFromOrder(order);
}

function intakeForDisplay(order: LiverCareOrder, intake: ScanPatientIntake | null): ScanPatientIntake {
  if (intake) return intake;
  const seed = patientIntakeFromOrder(order);
  return {
    orderId: order.id,
    ...seed,
    operatorVerificationStatus: 'approved',
  };
}

export function TechnicianPatientIntakePanel({
  order,
  paymentReady,
  visitReady,
  intakeOtpSent = false,
  onUpdated,
}: TechnicianPatientIntakePanelProps) {
  const [intake, setIntake] = useState<ScanPatientIntake | null>(null);
  const [form, setForm] = useState<ScanPatientIntakeInput>(defaultForm(order, null));
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, canResend, startCooldown } = useOtpResendCooldown();

  const load = async () => {
    const row = await technicianOrderService.getPatientIntake(order.id);
    setIntake(row);
    setForm(defaultForm(order, row));
    setOtpSent(Boolean(row?.phoneOtpVerified) || intakeOtpSent);
  };

  useEffect(() => {
    void load();
  }, [order.id, intakeOtpSent]);

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

  const displayIntake = intakeForDisplay(order, intake);

  if (!paymentReady) {
    const paymentMessage =
      order.paymentStatus === 'processing'
        ? 'Payment submitted — awaiting operations verification before patient intake.'
        : 'Payment must be collected before patient intake. Contact operations if payment is pending.';
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Patient details intake</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm text-muted-foreground">
          {paymentMessage}
        </CardContent>
      </Card>
    );
  }

  if (!visitReady) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Patient details</CardTitle>
          <CardDescription>
            Review patient details from operations or order defaults. Verify and update with phone OTP when you reach
            the patient location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientIntakeSummary
            intake={displayIntake}
            title={intake?.operatorEnteredAt ? 'Details from operations' : 'Details from booking'}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Mark yourself at the patient location to begin verification.
          </p>
        </CardContent>
      </Card>
    );
  }

  const submitted = Boolean(intake?.technicianVerifiedAt && intake.phoneOtpVerified);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">1. Patient details intake</CardTitle>
          {submitted && <Badge variant="secondary">Verified</Badge>}
        </div>
        <CardDescription>
          Confirm or update patient details with the patient at home. Phone OTP is required before continuing to
          FibroScan intake.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!submitted && (
          <PatientIntakeSummary
            intake={displayIntake}
            title={intake?.operatorEnteredAt ? 'Details from operations — confirm or update below' : 'Enter patient details below'}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              disabled={submitted}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Sex</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              value={form.sex}
              disabled={submitted}
              onChange={(e) => setForm({ ...form, sex: e.target.value as PatientSex })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Age</Label>
            <Input
              inputMode="numeric"
              value={form.age}
              disabled={submitted}
              onChange={(e) => setForm({ ...form, age: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label>Phone (OTP required)</Label>
            <Input
              value={form.phone}
              disabled={submitted}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Weight kg (if available)</Label>
            <Input
              inputMode="decimal"
              value={form.weightKg ?? ''}
              disabled={submitted}
              onChange={(e) =>
                setForm({ ...form, weightKg: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Height m (if available)</Label>
            <Input
              inputMode="decimal"
              value={form.heightMeters ?? ''}
              disabled={submitted}
              onChange={(e) =>
                setForm({ ...form, heightMeters: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
        </div>

        <ComorbidityChecklist
          value={form.comorbidities}
          onChange={(comorbidities) => setForm({ ...form, comorbidities })}
          disabled={submitted}
          readOnly={submitted}
        />

        {!submitted && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-medium">Phone OTP verification</p>
            {!otpSent ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={saving || !form.phone.trim() || !canResend}
                onClick={() =>
                  run(async () => {
                    const visit = await technicianOrderService.sendPatientIntakeOtp(order.id);
                    applyOtpSendMeta(visit, startCooldown);
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
                  disabled={saving || otp.length < 4}
                  onClick={() =>
                    run(() => technicianOrderService.verifyTechnicianIntake(order.id, form, otp))
                  }
                >
                  Submit patient intake
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
                    const visit = await technicianOrderService.sendPatientIntakeOtp(order.id);
                    applyOtpSendMeta(visit, startCooldown);
                  })
                }
              >
                {canResend ? 'Resend OTP' : `Resend in ${remaining}s`}
              </Button>
            )}
          </div>
        )}

        {submitted && (
          <p className="text-sm text-muted-foreground">
            Verified {new Date(intake!.technicianVerifiedAt!).toLocaleString()}. Continue to FibroScan intake.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
