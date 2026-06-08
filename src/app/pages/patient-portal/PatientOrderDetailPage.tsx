import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { finalReportService, liverCareOrderService, patientPortalService, prescriptionOrderService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder, OrderTimelineEvent } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { OrderInvoice } from '@/types/patientPortal';
import type { FinalReport } from '@/types/finalReport';
import type { LiverCarePrescription } from '@/types/consultation';
import { PatientScanScheduleSection } from '@/app/pages/patient-portal/components/PatientScanScheduleSection';

export function PatientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = usePatientPortalStore((s) => s.session)!;
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [prescription, setPrescription] = useState<LiverCarePrescription | null>(null);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      patientPortalService.getMyOrder(session.phone, id),
      liverCareOrderService.getTimeline(id),
      patientPortalService.getInvoice(id, session.phone),
      finalReportService.getPublishedForPatient(id, session.phone),
      prescriptionOrderService.getPublishedForPatient(id, session.phone),
    ]).then(([o, tl, inv, rpt, rx]) => {
      setOrder(o);
      setTimeline(tl);
      setInvoice(inv);
      setReport(rpt);
      setPrescription(rx);
    });
  }, [id, session.phone]);

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground">{order.packageName}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/patient">Back</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Amount</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">₹{order.finalAmount.toLocaleString('en-IN')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payment</CardTitle></CardHeader>
          <CardContent><Badge className="capitalize">{order.paymentStatus}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent className="text-sm">{ORDER_STATUS_LABELS[order.orderStatus]}</CardContent>
        </Card>
      </div>

      {order.paymentStatus !== 'success' && (
        <Button asChild>
          <Link to={`/patient/orders/${order.id}/pay`}>Pay now — dummy Razorpay</Link>
        </Button>
      )}

      <PatientScanScheduleSection
        order={order}
        phone={session.phone}
        onUpdated={(updated) => setOrder(updated)}
      />

      {invoice && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm">Invoice / receipt available</span>
            <Button size="sm" variant="outline" asChild>
              <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">Download</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {report ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-green-900">Final report available</p>
              <p className="text-sm text-green-800">{report.reportNumber}</p>
            </div>
            <Button size="sm" asChild>
              <Link to={`/patient/orders/${order.id}/report`}>View report</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Your final report will appear here once published by our clinical team.
          </CardContent>
        </Card>
      )}

      {prescription ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-green-900">Prescription available</p>
              <p className="text-sm text-green-800">{prescription.doctorName}</p>
            </div>
            <Button size="sm" asChild>
              <Link to={`/patient/orders/${order.id}/prescription`}>View prescription</Link>
            </Button>
          </CardContent>
        </Card>
      ) : order.packageCode === 'PKG-3' ? (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Your doctor&apos;s prescription will appear here after your consultation.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Order timeline</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {timeline.map((t) => (
              <li key={t.id} className="flex justify-between gap-4">
                <span>{t.label}</span>
                <span className="text-muted-foreground">
                  {new Date(t.occurredAt).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
