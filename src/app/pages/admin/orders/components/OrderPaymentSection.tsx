import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { liverCareOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { OfflinePaymentRecord } from '@/types/payment';
import type { OrderInvoice } from '@/types/patientPortal';
import { LiverCareOfflinePaymentModal } from './LiverCareOfflinePaymentModal';

interface OrderPaymentSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderPaymentSection({ order, onUpdated, readOnly = false }: OrderPaymentSectionProps) {
  const [showOffline, setShowOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<OfflinePaymentRecord[]>([]);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);

  useEffect(() => {
    void liverCareOrderService.listOfflinePayments(order.id).then(setOfflineRecords);
    if (order.paymentStatus === 'success') {
      void liverCareOrderService.getInvoice(order.id).then(setInvoice);
    } else {
      setInvoice(null);
    }
  }, [order.id, order.paymentStatus]);

  const handleOffline = async (body: Parameters<typeof liverCareOrderService.markOfflinePayment>[1]) => {
    setSaving(true);
    try {
      await liverCareOrderService.markOfflinePayment(order.id, body);
      setShowOffline(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleSendLink = async () => {
    setSendingLink(true);
    try {
      await liverCareOrderService.sendPaymentLink(order.id, ['whatsapp', 'sms', 'email']);
      onUpdated();
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge className="capitalize">{order.paymentStatus}</Badge>
            {order.paymentMode && (
              <>
                <span className="text-muted-foreground">Mode:</span>
                <span className="capitalize">{order.paymentMode.replace(/_/g, ' ')}</span>
              </>
            )}
            <span className="text-muted-foreground">Due:</span>
            <span className="font-semibold">₹{order.finalAmount.toLocaleString('en-IN')}</span>
          </div>

          {!readOnly && order.paymentStatus !== 'success' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowOffline(true)}>Mark offline payment</Button>
              <Button size="sm" variant="secondary" onClick={handleSendLink} disabled={sendingLink}>
                {sendingLink ? 'Sending…' : 'Send online payment link'}
              </Button>
            </div>
          )}

          {offlineRecords.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Offline collections</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {offlineRecords.map((r) => (
                  <li key={r.id}>
                    ₹{r.amount.toLocaleString('en-IN')} · {r.method} · {r.collectedBy}
                    {r.transactionRef ? ` · ${r.transactionRef}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invoice && (
            <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 text-sm">
              <span>Invoice / receipt generated</span>
              <Button size="sm" variant="outline" asChild>
                <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showOffline && (
        <LiverCareOfflinePaymentModal
          order={order}
          isSaving={saving}
          onClose={() => setShowOffline(false)}
          onSubmit={handleOffline}
        />
      )}
    </>
  );
}
