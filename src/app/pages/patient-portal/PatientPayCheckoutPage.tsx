import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { liverCareOrderService, patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function PatientPayCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = usePatientPortalStore((s) => s.session)!;
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [method, setMethod] = useState<'upi' | 'card'>('upi');
  const [phase, setPhase] = useState<'checkout' | 'processing' | 'done'>('checkout');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void patientPortalService.getMyOrder(session.phone, id).then(setOrder);
  }, [id, session.phone]);

  const handlePay = async (outcome: 'success' | 'failure') => {
    if (!id) return;
    setPhase('processing');
    setError(null);
    try {
      await liverCareOrderService.completePortalPayment(id, session.phone, method, outcome);
      setPhase('done');
      if (outcome === 'success') {
        setTimeout(() => navigate(`/patient/orders/${id}`), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setPhase('checkout');
    }
  };

  if (!order) {
    return <p className="text-muted-foreground">Loading checkout…</p>;
  }

  if (order.paymentStatus === 'success') {
    return (
      <div className="text-center">
        <p className="text-green-700">Already paid.</p>
        <Button className="mt-4" asChild><Link to={`/patient/orders/${order.id}`}>View order</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Secured by</p>
        <p className="text-2xl font-bold text-blue-700">Razorpay</p>
        <p className="text-xs text-muted-foreground">(dummy checkout — dev only)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{order.orderNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">{order.packageName}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold text-center">₹{order.finalAmount.toLocaleString('en-IN')}</p>

          {phase === 'checkout' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={method === 'upi' ? 'default' : 'outline'} onClick={() => setMethod('upi')}>UPI</Button>
                <Button variant={method === 'card' ? 'default' : 'outline'} onClick={() => setMethod('card')}>Card</Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                In production this redirects to Razorpay. Use buttons below to simulate outcome.
              </p>
              <Button className="w-full" onClick={() => handlePay('success')}>Simulate payment success</Button>
              <Button className="w-full" variant="outline" onClick={() => handlePay('failure')}>Simulate payment failure</Button>
            </>
          )}

          {phase === 'processing' && (
            <p className="text-center text-sm text-muted-foreground">Processing payment…</p>
          )}

          {phase === 'done' && (
            <p className="text-center text-sm text-green-700">Payment successful! Redirecting…</p>
          )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full" asChild>
        <Link to={`/patient/orders/${order.id}`}>Cancel</Link>
      </Button>
    </div>
  );
}
