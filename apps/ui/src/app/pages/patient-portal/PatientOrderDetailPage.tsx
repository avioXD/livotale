import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { usePatientPortalRealtime } from '@/hooks/useRealtimeNotifications';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientPortalBreadcrumbs } from '@/app/layouts/patient-portal/PatientPortalBreadcrumbs';
import { PatientOrderProgressStepper } from '@/app/pages/patient-portal/components/PatientOrderProgressStepper';
import { PatientScanScheduleSection } from '@/app/pages/patient-portal/components/PatientScanScheduleSection';
import { PatientPathologyScheduleSection } from '@/app/pages/patient-portal/components/PatientPathologyScheduleSection';
import { PatientConsultScheduleSection } from '@/app/pages/patient-portal/components/PatientConsultScheduleSection';
import { finalReportService, packageService, patientPortalService, prescriptionOrderService } from '@/services/liverCare';
import { getPatientOrderProgressSteps } from '@/services/liverCare/patientOrderProgress';
import { usePatientPortalStore } from '@/store';
import type { LiverCareOrder, OrderTimelineEvent } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { OrderInvoice } from '@/types/patientPortal';
import type { FinalReport } from '@/types/finalReport';
import type { LiverCarePrescription } from '@/types/consultation';
import type { LiverCarePackage } from '@/types/package';

export function PatientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const session = usePatientPortalStore((s) => s.session)!;
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [prescription, setPrescription] = useState<LiverCarePrescription | null>(null);
  const [pkg, setPkg] = useState<LiverCarePackage | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [o, tl, inv, rpt, rx, packages] = await Promise.all([
        patientPortalService.getMyOrder(session.phone, id),
        patientPortalService.getTimeline(session.phone, id),
        patientPortalService.getInvoice(id, session.phone),
        finalReportService.getPublishedForPatient(id, session.phone),
        prescriptionOrderService.getPublishedForPatient(id, session.phone),
        packageService.listAdmin(),
      ]);
      setOrder(o);
      setTimeline(tl);
      setInvoice(inv);
      setReport(rpt);
      setPrescription(rx);
      if (o) setPkg(packages.find((p) => p.id === o.packageId) ?? null);
    } finally {
      setLoading(false);
    }
  }, [id, session.phone]);

  useEffect(() => {
    void reload();
  }, [reload]);

  usePatientPortalRealtime(session.phone, () => {
    void reload();
  });

  useEffect(() => {
    if (searchParams.get('focus') === 'scan-schedule' && order) {
      document.getElementById('patient-scan-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams, order]);

  if (loading) {
    return <p className="text-muted-foreground">Loading order…</p>;
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const progressSteps = getPatientOrderProgressSteps(order);
  const paymentPending = order.paymentStatus !== 'success';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="lg:hidden">
        <PatientPortalBreadcrumbs orderNumber={order.orderNumber} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <p className="text-muted-foreground">{order.packageName}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your progress</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientOrderProgressStepper steps={progressSteps} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Amount</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">₹{order.finalAmount.toLocaleString('en-IN')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payment</CardTitle></CardHeader>
          <CardContent><StatusBadge status={order.paymentStatus} domain="payment" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent>
            <StatusBadge status={order.orderStatus} domain="order" label={ORDER_STATUS_LABELS[order.orderStatus]} />
          </CardContent>
        </Card>
      </div>

      {paymentPending && (
        <div className="hidden lg:block">
          <Button asChild>
            <Link to={`/patient/orders/${order.id}/pay`}>Pay now</Link>
          </Button>
        </div>
      )}

      <PatientScanScheduleSection
        order={order}
        phone={session.phone}
        onUpdated={(updated) => setOrder(updated)}
      />

      {pkg?.pathologyIncluded && (
        <PatientPathologyScheduleSection
          order={order}
          phone={session.phone}
          onUpdated={(updated) => setOrder(updated)}
        />
      )}

      {pkg?.consultationIncluded && (
        <PatientConsultScheduleSection
          order={order}
          phone={session.phone}
          onUpdated={(updated) => setOrder(updated)}
        />
      )}

      {invoice && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
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
                <span className="shrink-0 text-muted-foreground">
                  {new Date(t.occurredAt).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {paymentPending && (
        <div
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-4 backdrop-blur lg:hidden"
        >
          <Button className="w-full" asChild>
            <Link to={`/patient/orders/${order.id}/pay`}>Pay now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
