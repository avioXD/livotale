import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiCopy } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientPortalBreadcrumbs } from '@/app/layouts/patient-portal/PatientPortalBreadcrumbs';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { PatientPaymentConfig } from '@/types/patientPortal';

export function PatientPayCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = usePatientPortalStore((s) => s.session)!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [config, setConfig] = useState<PatientPaymentConfig | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      patientPortalService.getMyOrder(session.phone, id),
      patientPortalService.getPaymentConfig(),
    ]).then(([o, cfg]) => {
      setOrder(o);
      setConfig(cfg);
    });
  }, [id, session.phone]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const handleCopyUpi = async () => {
    if (!config?.upiId) return;
    await navigator.clipboard.writeText(config.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!id || !receiptFile) {
      setError('Upload a screenshot of your payment before continuing.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const uploaded = await patientPortalService.uploadPaymentReceipt(session.phone, id, receiptFile);
      await patientPortalService.payOrder(id, session.phone, {
        method: 'upi',
        receiptFileId: uploaded.fileId,
        transactionRef: transactionRef.trim() || undefined,
      });
      navigate(`/patient/orders/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) {
    return <p className="text-muted-foreground">Loading checkout…</p>;
  }

  if (order.paymentStatus === 'success') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-green-700">Payment already completed.</p>
        <Button asChild><Link to={`/patient/orders/${order.id}`}>View order</Link></Button>
      </div>
    );
  }

  if (order.paymentStatus === 'processing') {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <Card>
          <CardContent className="space-y-3 py-8">
            <p className="text-lg font-semibold">Payment under review</p>
            <p className="text-sm text-muted-foreground">
              We received your payment proof. Operations will verify it shortly.
            </p>
            <Button asChild variant="outline">
              <Link to={`/patient/orders/${order.id}`}>Back to order</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="lg:hidden">
        <PatientPortalBreadcrumbs orderNumber={order.orderNumber} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{order.orderNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">{order.packageName}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-center text-3xl font-bold">₹{order.finalAmount.toLocaleString('en-IN')}</p>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Pay via UPI</p>
            {config?.payeeName && (
              <p className="text-xs text-muted-foreground">Pay to: {config.payeeName}</p>
            )}
            {config?.qrImageUrl ? (
              <img
                src={config.qrImageUrl}
                alt="UPI QR code"
                className="mx-auto h-44 w-44 rounded-md border bg-white object-contain p-2"
              />
            ) : (
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-md border border-dashed bg-background text-xs text-muted-foreground">
                QR not configured
              </div>
            )}
            {config?.upiId ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-sm">{config.upiId}</code>
                <Button type="button" size="icon" variant="outline" onClick={handleCopyUpi} aria-label="Copy UPI ID">
                  <FiCopy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-amber-700">UPI ID is not configured yet. Contact support if you need help.</p>
            )}
            {copied && <p className="text-xs text-green-700">UPI ID copied</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn-ref">UPI transaction reference (optional)</Label>
            <Input
              id="txn-ref"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. 123456789012"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment screenshot</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              {receiptFile ? receiptFile.name : 'Upload screenshot'}
            </Button>
            {receiptPreview && (
              <img src={receiptPreview} alt="Payment proof preview" className="max-h-48 rounded-md border object-contain" />
            )}
          </div>

          <Button className="w-full" disabled={submitting || !receiptFile} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'I have paid'}
          </Button>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full" asChild>
        <Link to={`/patient/orders/${order.id}`}>Cancel</Link>
      </Button>
    </div>
  );
}
