import { useState } from 'react';
import { DemoPaymentGateway } from '@/app/pages/admin/operations/components/DemoPaymentGateway';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminOperationsService } from '@/services/admin/AdminOperationsService';
import type { DemoPayMethod } from '@/types/adminOperations';

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

  const handlePay = async (method: DemoPayMethod) => {
    setIsProcessing(true);
    try {
      if (appointmentId) {
        await adminOperationsService.patientDemoPay(appointmentId, method);
      }
      setPaid(true);
      setTimeout(() => onNext(), 800);
    } catch {
      // Demo: allow continue even if API unavailable
      setPaid(true);
      setTimeout(() => onNext(), 800);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showGateway || paid) {
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
          Pay now with our demo gateway (UPI / card) or continue — clinic may collect at visit.
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
          <Button type="button" variant="outline" className="flex-1" onClick={() => setShowGateway(true)}>
            Pay online (demo)
          </Button>
          <Button className="flex-1" onClick={onNext}>
            Pay at clinic
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
