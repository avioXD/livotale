import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogTextarea } from '@/components/forms/LogTextarea';
import { liverCareOrderService } from '@/services/liverCare';
import { toastSuccess, toastError } from '@/store/toast/toastStore';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { OfflinePaymentRecord } from '@/types/payment';
import type { OrderInvoice } from '@/types/patientPortal';
import { LiverCareOfflinePaymentModal } from './LiverCareOfflinePaymentModal';

type PaymentChannel = 'whatsapp' | 'sms' | 'email';

interface OrderPaymentSectionProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
};

export function OrderPaymentSection({ order, onUpdated, readOnly = false }: OrderPaymentSectionProps) {
  const [showOffline, setShowOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<OfflinePaymentRecord[]>([]);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [channels, setChannels] = useState<PaymentChannel[]>(['whatsapp', 'sms', 'email']);

  useEffect(() => {
    void liverCareOrderService.listOfflinePayments(order.id).then(setOfflineRecords);
    if (order.paymentStatus === 'success') {
      void liverCareOrderService.getInvoice(order.id).then(setInvoice);
    } else {
      setInvoice(null);
    }
  }, [order.id, order.paymentStatus]);

  const pendingProof = [...offlineRecords].reverse().find((r) => r.status === 'processing') ?? null;

  const toggleChannel = (channel: PaymentChannel) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  const handleOffline = async (body: Parameters<typeof liverCareOrderService.markOfflinePayment>[1]) => {
    setSaving(true);
    try {
      await liverCareOrderService.markOfflinePayment(order.id, body);
      setShowOffline(false);
      toastSuccess('Offline payment recorded.');
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await liverCareOrderService.verifyPayment(order.id);
      toastSuccess('Payment verified.');
      onUpdated();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    setVerifying(true);
    try {
      await liverCareOrderService.rejectPayment(order.id, rejectRemarks.trim() || undefined);
      toastSuccess('Payment proof rejected.');
      setRejectRemarks('');
      onUpdated();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not reject payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendLink = async () => {
    if (channels.length === 0) {
      toastError('Select at least one notification channel.');
      return;
    }
    if (channels.includes('email') && !order.patientEmail?.trim()) {
      toastError('No patient email on file — uncheck Email or add email to patient profile.');
      return;
    }

    setSendingLink(true);
    try {
      await liverCareOrderService.sendPaymentLink(order.id, channels);
      const sent = channels
        .filter((ch) => ch !== 'email' || order.patientEmail?.trim())
        .map((ch) => CHANNEL_LABELS[ch]);
      toastSuccess(`Payment link sent via ${sent.join(', ')}.`);
      onUpdated();
    } finally {
      setSendingLink(false);
    }
  };

  const canCollect = !readOnly && order.paymentStatus !== 'success' && order.paymentStatus !== 'processing';
  const awaitingVerify = !readOnly && order.paymentStatus === 'processing';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge status={order.paymentStatus} domain="payment" />
            {order.paymentMode && (
              <>
                <span className="text-muted-foreground">Mode:</span>
                <span className="capitalize">{order.paymentMode.replace(/_/g, ' ')}</span>
              </>
            )}
            <span className="text-muted-foreground">Due:</span>
            <span className="font-semibold">₹{order.finalAmount.toLocaleString('en-IN')}</span>
          </div>

          {awaitingVerify && (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Patient payment proof awaiting verification</p>
              {pendingProof?.transactionRef && (
                <p className="text-xs text-amber-800">Transaction ref: {pendingProof.transactionRef}</p>
              )}
              {pendingProof?.receiptUrl && (
                <a href={pendingProof.receiptUrl} target="_blank" rel="noreferrer" className="inline-block">
                  <img
                    src={pendingProof.receiptUrl}
                    alt="Payment proof"
                    className="max-h-56 rounded-md border bg-white object-contain"
                  />
                </a>
              )}
              <div className="space-y-2">
                <LogTextarea
                  id="reject-remarks"
                  value={rejectRemarks}
                  onChange={setRejectRemarks}
                  limit="LOG_SHORT"
                  rows={2}
                  label="Rejection note (optional)"
                  placeholder="Reason if rejecting the proof"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleVerify} disabled={verifying}>
                  {verifying ? 'Working…' : 'Verify payment'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleReject} disabled={verifying}>
                  Reject
                </Button>
              </div>
            </div>
          )}

          {canCollect && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Send link via</Label>
                <div className="flex flex-wrap gap-3">
                  {(['whatsapp', 'sms', 'email'] as PaymentChannel[]).map((channel) => (
                    <label key={channel} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                      {CHANNEL_LABELS[channel]}
                    </label>
                  ))}
                </div>
                {channels.includes('email') && !order.patientEmail?.trim() && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    No patient email on file — email channel will be skipped unless you add one to the patient profile.
                  </p>
                )}
                {order.patientEmail?.trim() && (
                  <p className="text-xs text-muted-foreground">Patient email: {order.patientEmail}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowOffline(true)}>Mark offline payment</Button>
                <Button size="sm" variant="secondary" onClick={handleSendLink} disabled={sendingLink}>
                  {sendingLink ? 'Sending…' : 'Send online payment link'}
                </Button>
              </div>
            </div>
          )}

          {offlineRecords.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Payment records</p>
              <ul className="mt-2 space-y-3 text-muted-foreground">
                {offlineRecords.map((r) => (
                  <li key={r.id} className="space-y-1">
                    <p>
                      ₹{r.amount.toLocaleString('en-IN')} · {r.method} · {r.collectedBy}
                      {r.status ? ` · ${r.status}` : ''}
                      {r.transactionRef ? ` · ${r.transactionRef}` : ''}
                    </p>
                    {r.receiptUrl && (
                      <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        View receipt
                      </a>
                    )}
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
