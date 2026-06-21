import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { technicianOrderService } from '@/services/liverCare';
import { applyOtpSendMeta, useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import type { TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import type { LiverCareOrder } from '@/types/serviceOrder';

interface TechnicianVisitCompletionPanelProps {
  order: LiverCareOrder;
  visit: TechnicianOrderVisit | null;
  currentStep: TechnicianVisitStep;
  canComplete: boolean;
  acting: boolean;
  id?: string;
  onComplete: (otp: string) => void;
  onOtpSent: () => void;
}

export function TechnicianVisitCompletionPanel({
  order,
  visit,
  currentStep,
  canComplete,
  acting,
  id = 'visit-completion-otp',
  onComplete,
  onOtpSent,
}: TechnicianVisitCompletionPanelProps) {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, canResend, startCooldown } = useOtpResendCooldown();

  useEffect(() => {
    setOtpSent(Boolean(visit?.visitCompletionOtpSentAt));
    if (currentStep === 'scan_completed') {
      setOtp('');
      setDemoOtpHint(null);
    }
  }, [visit?.visitCompletionOtpSentAt, currentStep, order.id]);

  if (currentStep === 'scan_completed' || currentStep === 'unable_to_complete') {
    return null;
  }

  if (!canComplete || !['reached_location', 'scan_in_progress'].includes(currentStep)) {
    return null;
  }

  const handleSendOtp = async () => {
    if (!canResend) return;
    setSending(true);
    setError(null);
    try {
      const visit = await technicianOrderService.sendVisitCompletionOtp(order.id);
      setDemoOtpHint(applyOtpSendMeta(visit, startCooldown) ?? null);
      setOtpSent(true);
      onOtpSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card id={id} className="scroll-mt-4 border-livotale-pink/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">4. Complete home visit with patient OTP</CardTitle>
        <CardDescription>
          Send an OTP to the patient&apos;s phone. The patient must share the code to confirm the visit and scan
          are complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Patient phone:</span>
          <span className="font-medium">{order.patientPhone}</span>
          {visit?.visitCompletionOtpVerified && (
            <Badge className="bg-emerald-600">OTP verified</Badge>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          {!otpSent ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={sending || acting || !canResend}
              onClick={() => void handleSendOtp()}
            >
              {sending
                ? 'Sending…'
                : canResend
                  ? `Send completion OTP to ${order.patientPhone}`
                  : `Resend in ${remaining}s`}
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Patient OTP
                </Label>
                {demoOtpHint ? <p className="text-xs text-muted-foreground">Demo code: {demoOtpHint}</p> : null}
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-36"
                  placeholder="6-digit OTP"
                />
              </div>
              <Button
                size="sm"
                disabled={acting || otp.trim().length < 4}
                onClick={() => onComplete(otp.trim())}
              >
                Verify OTP &amp; complete visit
              </Button>
            </div>
          )}
          {otpSent && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              disabled={sending || acting || !canResend}
              onClick={() => void handleSendOtp()}
            >
              {canResend ? 'Resend OTP' : `Resend in ${remaining}s`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
