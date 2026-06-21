import { useState } from 'react';
import { DemoPaymentGateway } from '@/app/pages/admin/operations/components/DemoPaymentGateway';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DemoPayMethod } from '@/types/adminOperations';
import { isDevMode } from '@/app/config/appMode';

interface PaymentStepProps {
  amount: number;
  typeName: string;
  appointmentId?: string;
  onBack: () => void;
  onNext: () => void;
}

export function PaymentStep({ amount, typeName, appointmentId, onBack, onNext }: PaymentStepProps) {
  const [showGateway, setShowGateway] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const devMode = isDevMode();

  const handlePay = async (_method: DemoPayMethod) => {
    setIsProcessing(true);
    try {
      if (devMode && appointmentId) {
        // Legacy appointment demo-pay removed with Fastify; dev mode simulates success locally.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      setPaid(true);
      setTimeout(() => onNext(), 800);
    } catch {
      setPaid(true);
      setTimeout(() => onNext(), 800);
    } finally {
      setIsProcessing(false);
    }
  };

  if (devMode && (showGateway || paid)) {
    return (
      <DemoPaymentGateway
        amount={amount}
        serviceLabel={typeName}
        isProcessing={isProcessing}
        onPay={handlePay}
        onCancel={paid ? undefined : () => setShowGateway(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          {devMode
            ? 'Pay now with our demo gateway (UPI / card) or continue — clinic may collect at visit.'
            : 'Continue — clinic will collect payment at visit or via patient portal checkout.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">{typeName}</p>
          <p className="mt-1 text-2xl font-semibold">₹{amount.toLocaleString('en-IN')}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          {devMode && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowGateway(true)}>
              Pay online (demo)
            </Button>
          )}
          <Button className="flex-1" onClick={onNext}>
            {devMode ? 'Pay at clinic' : 'Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
