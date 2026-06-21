import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientAppointmentRecord, PatientPaymentRecord, PatientReportRecord } from '@/types/patientClinical';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { LabReportUpload } from '@/types/labReport';
import { orgPath } from '@/app/config/orgRoutes';

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
            <StatusBadge status={o.orderStatus} domain="order" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Package: </span>{o.packageCode} · ₹{o.finalAmount.toLocaleString('en-IN')}</p>
            <p><span className="text-muted-foreground">Payment: </span><span className="capitalize">{o.paymentStatus.replace(/_/g, ' ')}</span></p>
            {o.technicianName && <p><span className="text-muted-foreground">Technician: </span>{o.technicianName}</p>}
            {o.partnerLabName && <p><span className="text-muted-foreground">Lab: </span>{o.partnerLabName}</p>}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={orgPath(`/admin/orders/${o.id}`)}>View order — scan, lab & reports</Link>
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
                <StatusBadge status={p.paymentStatus} domain="payment" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PatientAppointmentsPanel({ appointments }: { appointments: PatientAppointmentRecord[] }) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No consultation appointments scheduled yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Package</th>
            <th className="px-4 py-3 font-medium">Scheduled</th>
            <th className="px-4 py-3 font-medium">Doctor</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.orderId} className="border-b last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{a.orderNumber}</td>
              <td className="px-4 py-3">{a.packageName}</td>
              <td className="px-4 py-3">
                {a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-3">{a.doctorName ?? '—'}</td>
              <td className="px-4 py-3 capitalize">{a.status.replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PatientTestsPanel({ reports }: { reports: LabReportUpload[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No pathology / lab reports on file.</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{r.fileName ?? 'Lab report'}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {r.uploadedAt ? new Date(r.uploadedAt).toLocaleString() : 'Upload date unknown'}
            </p>
          </CardHeader>
          {(r.finalStatus || r.extractionStatus || r.fileUrl) && (
            <CardContent className="space-y-2 text-sm">
              {r.finalStatus && (
                <p className="capitalize">Status: {r.finalStatus.replace(/_/g, ' ')}</p>
              )}
              {r.extractionStatus && (
                <p className="text-muted-foreground capitalize">
                  Extraction: {r.extractionStatus.replace(/_/g, ' ')}
                </p>
              )}
              {r.fileUrl && (
                <Button variant="link" className="h-auto p-0" asChild>
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                    Open PDF
                  </a>
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

export function PatientScansPanel({ scans }: { scans: FibrosisScanRecord[] }) {
  if (scans.length === 0) {
    return <p className="text-sm text-muted-foreground">No FibroScan records for this patient.</p>;
  }

  return (
    <div className="space-y-3">
      {scans.map((s) => (
        <Card key={s.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">FibroScan · {s.fibrosisStage}</CardTitle>
            <p className="text-xs text-muted-foreground">
              LSM {s.liverStiffnessKpa} kPa · CAP {s.capDbm} dB/m
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{s.interpretation}</CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PatientReportsPanel({ reports }: { reports: PatientReportRecord[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No final reports or prescriptions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.orderId}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-base">{r.packageName}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{r.orderNumber}</p>
            </div>
            <StatusBadge status={r.orderStatus} domain="order" />
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={orgPath(`/admin/orders/${r.orderId}`)}>View order reports</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
