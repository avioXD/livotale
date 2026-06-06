import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentStepProps {
  amount: number;
  typeName: string;
  onBack: () => void;
  onNext: () => void;
}

export function PaymentStep({ amount, typeName, onBack, onNext }: PaymentStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          Payment integration is coming soon. Your booking will be held as pending payment until checkout is enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">{typeName}</p>
          <p className="mt-1 text-2xl font-semibold">₹{amount.toLocaleString('en-IN')}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            You can confirm now; payment will be collected before the appointment is fully confirmed.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1" onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
