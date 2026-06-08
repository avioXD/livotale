import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { OfflinePaymentMethod } from '@/types/payment';

interface LiverCareOfflinePaymentModalProps {
  order: LiverCareOrder;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (body: {
    method: OfflinePaymentMethod;
    amount: number;
    collectedBy: string;
    transactionRef?: string;
    remarks?: string;
  }) => Promise<void>;
}

const METHODS: { value: OfflinePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

export function LiverCareOfflinePaymentModal({
  order,
  isSaving,
  onClose,
  onSubmit,
}: LiverCareOfflinePaymentModalProps) {
  const [method, setMethod] = useState<OfflinePaymentMethod>('cash');
  const [amount, setAmount] = useState(String(order.finalAmount));
  const [collectedBy, setCollectedBy] = useState('Operations Desk');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Mark offline payment</CardTitle>
          <p className="text-sm text-muted-foreground">
            {order.patientName} · {order.orderNumber}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <Button
                key={m.value}
                type="button"
                size="sm"
                variant={method === m.value ? 'default' : 'outline'}
                onClick={() => setMethod(m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offline-amount">Amount (₹)</Label>
            <Input
              id="offline-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collected-by">Collected by</Label>
            <Input
              id="collected-by"
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn-ref">Transaction reference</Label>
            <Input
              id="txn-ref"
              placeholder="UPI ref, receipt #…"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={isSaving || !amount || Number(amount) <= 0 || !collectedBy.trim()}
              onClick={() =>
                void onSubmit({
                  method,
                  amount: Number(amount),
                  collectedBy: collectedBy.trim(),
                  transactionRef: transactionRef.trim() || undefined,
                  remarks: remarks.trim() || undefined,
                })
              }
            >
              Mark paid
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
