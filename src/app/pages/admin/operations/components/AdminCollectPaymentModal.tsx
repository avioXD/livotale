import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PaymentCollectMethod, ServiceOrder } from '@/types/adminOperations';

interface AdminCollectPaymentModalProps {
  order: ServiceOrder;
  isSaving: boolean;
  onClose: () => void;
  onCollect: (method: PaymentCollectMethod, amount: number, notes: string) => Promise<void>;
}

export function AdminCollectPaymentModal({
  order,
  isSaving,
  onClose,
  onCollect,
}: AdminCollectPaymentModalProps) {
  const [method, setMethod] = useState<PaymentCollectMethod>('cash');
  const [amount, setAmount] = useState(String(order.amount));
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Collect payment</CardTitle>
          <p className="text-sm text-muted-foreground">
            {order.patientName} · {order.orderNumber} · {order.serviceLabel}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'online', 'qr'] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={method === m ? 'default' : 'outline'}
                className="capitalize"
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>

          {method === 'qr' && (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Display clinic UPI QR — patient scans to pay (demo: mark as collected after scan)
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="collect-amount">Amount (₹)</Label>
            <Input
              id="collect-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collect-notes">Notes</Label>
            <Input
              id="collect-notes"
              placeholder="Receipt #, UPI ref…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={isSaving || !amount || Number(amount) <= 0}
              onClick={() => void onCollect(method, Number(amount), notes)}
            >
              Mark collected
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
