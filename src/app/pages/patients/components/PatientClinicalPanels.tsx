import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientClinicalContext, PatientPaymentRecord } from '@/types/patientClinical';
import type { PatientVisitRecord } from '@/types/patientProfile';
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
              <Link to={`/admin/operations?tab=orders&order=${o.id}`}>View order</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PatientTestsPanel({ pathologyReports }: Pick<PatientClinicalContext, 'pathologyReports'>) {
  if (pathologyReports.length === 0) {
    return <p className="text-sm text-muted-foreground">No pathology / lab test reports uploaded.</p>;
  }

  return (
    <div className="space-y-3">
      {pathologyReports.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{r.fileName}</CardTitle>
            <p className="text-xs text-muted-foreground">{r.partnerLabName}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{r.extractionStatus.replace(/_/g, ' ')}</Badge>
              <Badge variant="secondary" className="capitalize">{r.finalStatus}</Badge>
            </div>
            <p className="text-muted-foreground">Uploaded {new Date(r.uploadedAt).toLocaleString()}</p>
            {r.fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={r.fileUrl} target="_blank" rel="noreferrer">Open PDF</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PatientScansPanel({ scans }: Pick<PatientClinicalContext, 'scans'>) {
  if (scans.length === 0) {
    return <p className="text-sm text-muted-foreground">No fibrosis scan records yet.</p>;
  }

  return (
    <div className="space-y-3">
      {scans.map((s) => (
        <Card key={s.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Liver Fibrosis Scan</CardTitle>
            <p className="text-xs text-muted-foreground">{new Date(s.scanAt).toLocaleString()}</p>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">LSM: </span><strong>{s.liverStiffnessKpa} kPa</strong></p>
            <p><span className="text-muted-foreground">CAP: </span>{s.capDbm} dB/m</p>
            <p><span className="text-muted-foreground">F-stage: </span>{s.fibrosisStage}</p>
            <p><span className="text-muted-foreground">Steatosis: </span>{s.steatosisGrade}</p>
            <p className="sm:col-span-2 text-muted-foreground">{s.interpretation}</p>
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

export function PatientVisitsSection({ visits }: { visits: PatientVisitRecord[] }) {
  if (visits.length === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      <h3 className="text-sm font-semibold">Home visits</h3>
      {visits.map((v) => (
        <Card key={v.id}>
          <CardContent className="pt-4 text-sm space-y-1">
            <p className="font-medium capitalize">{v.visitType.replace(/_/g, ' ')}</p>
            <p className="text-muted-foreground">{new Date(v.scheduledAt).toLocaleString()} · {v.status}</p>
            {v.technicianName && <p>Technician: {v.technicianName}</p>}
            {v.addressSummary && <p className="text-muted-foreground">{v.addressSummary}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
