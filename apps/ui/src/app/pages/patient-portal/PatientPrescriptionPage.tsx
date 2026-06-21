import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PatientPortalBreadcrumbs } from '@/app/layouts/patient-portal/PatientPortalBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { patientPortalService, prescriptionOrderService } from '@/services/liverCare';
import { LiverCarePrescriptionPreview } from '@/app/pages/doctor/consultations/components/LiverCarePrescriptionPreview';
import { usePatientPortalStore } from '@/store';
import type { LiverCarePrescription } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function PatientPrescriptionPage() {
  const { id } = useParams<{ id: string }>();
  const session = usePatientPortalStore((s) => s.session)!;
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [prescription, setPrescription] = useState<LiverCarePrescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const o = await patientPortalService.getMyOrder(session.phone, id);
      setOrder(o);
      if (o) {
        setPrescription(await prescriptionOrderService.getPublishedForPatient(id, session.phone));
      }
      setLoading(false);
    })();
  }, [id, session.phone]);

  if (loading) {
    return <p className="text-muted-foreground">Loading prescription…</p>;
  }

  if (!prescription || !order) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">Your prescription is not available yet. It will appear here once published by your doctor.</p>
        <Button asChild variant="outline">
          <Link to={`/patient/orders/${id}`}>Back to order</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <PatientPortalBreadcrumbs />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prescription</h1>
          <p className="text-sm text-muted-foreground">
            {prescription.doctorName} · Published {prescription.publishedAt ? new Date(prescription.publishedAt).toLocaleString() : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {prescription.pdfUrl && (
            <Button asChild>
              <a href={prescription.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/patient/orders/${id}`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <LiverCarePrescriptionPreview order={order} prescription={prescription} />
        </CardContent>
      </Card>
    </div>
  );
}
