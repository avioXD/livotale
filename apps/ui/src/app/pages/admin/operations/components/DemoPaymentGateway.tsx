import { useState } from 'react';
import { FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DemoPayMethod } from '@/types/adminOperations';

const isDevMode = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';

interface DemoPaymentGatewayProps {
  amount: number;
  serviceLabel: string;
  isProcessing?: boolean;
  onPay: (method: DemoPayMethod) => void | Promise<void>;
  onCancel?: () => void;
}

export function DemoPaymentGateway({
  amount,
  serviceLabel,
  isProcessing,
  onPay,
  onCancel,
}: DemoPaymentGatewayProps) {
  const [method, setMethod] = useState<DemoPayMethod>('upi');
  const [step, setStep] = useState<'choose' | 'processing' | 'done'>('choose');

  if (!isDevMode) {
    return null;
  }

  const handlePay = async () => {
    setStep('processing');
    try {
      await onPay(method);
      setStep('done');
    } catch {
      setStep('choose');
    }
  };

  if (step === 'done') {
    return (
      <Card className="border-green-500/30">
        <CardContent className="py-8 text-center">
          <p className="text-lg font-semibold text-green-700 dark:text-green-300">Payment successful</p>
          <p className="mt-2 text-sm text-muted-foreground">₹{amount.toLocaleString('en-IN')} paid via demo {method.toUpperCase()}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo payment gateway</CardTitle>
        <CardDescription>Simulated checkout — no real charges. Production will use Razorpay/Cashfree.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">{serviceLabel}</p>
          <p className="mt-1 text-2xl font-semibold">₹{amount.toLocaleString('en-IN')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={method === 'upi' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setMethod('upi')}
          >
            <FiSmartphone className="h-4 w-4" />
            UPI / QR
          </Button>
          <Button
            type="button"
            variant={method === 'card' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setMethod('card')}
          >
            <FiCreditCard className="h-4 w-4" />
            Card
          </Button>
        </div>

        {method === 'upi' && (
          <div className="rounded-md border border-dashed p-4 text-center">
            <div className="mx-auto mb-2 h-24 w-24 rounded bg-muted" aria-hidden />
            <p className="text-xs text-muted-foreground">Scan QR with any UPI app (demo)</p>
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isProcessing || step === 'processing'}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            disabled={isProcessing || step === 'processing'}
            onClick={() => void handlePay()}
          >
            {step === 'processing' ? 'Processing…' : `Pay ₹${amount.toLocaleString('en-IN')}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
