import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientPaymentRecord } from '@/types/patientClinical';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function PatientOrdersPanel({ orders }: { orders: LiverCareOrder[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">No liver care orders for this patient.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-base">{o.packageName}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{o.orderNumber}</p>
            </div>
            <Badge variant="outline" className="capitalize">{o.orderStatus.replace(/_/g, ' ')}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Package: </span>{o.packageCode} · ₹{o.finalAmount.toLocaleString('en-IN')}</p>
            <p><span className="text-muted-foreground">Payment: </span><span className="capitalize">{o.paymentStatus.replace(/_/g, ' ')}</span></p>
            {o.technicianName && <p><span className="text-muted-foreground">Technician: </span>{o.technicianName}</p>}
            {o.partnerLabName && <p><span className="text-muted-foreground">Lab: </span>{o.partnerLabName}</p>}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={`/admin/orders/${o.id}`}>View order — scan, lab & reports</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PatientPaymentsPanel({ payments }: { payments: PatientPaymentRecord[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payment records linked to orders.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Package</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.orderId} className="border-b last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{p.orderNumber}</td>
              <td className="px-4 py-3">{p.packageName}</td>
              <td className="px-4 py-3">₹{p.amount.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 capitalize">{p.paymentMode?.replace(/_/g, ' ') ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={p.paymentStatus === 'success' ? 'default' : 'outline'} className="capitalize">
                  {p.paymentStatus.replace(/_/g, ' ')}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
