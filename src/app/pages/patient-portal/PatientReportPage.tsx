import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { finalReportService, patientPortalService } from '@/services/liverCare';
import { FinalReportPreview } from '@/app/pages/admin/orders/components/FinalReportPreview';
import { usePatientPortalStore } from '@/store';
import type { FinalReport } from '@/types/finalReport';
import type { FinalReportPreviewData } from '@/types/finalReport';

export function PatientReportPage() {
  const { id } = useParams<{ id: string }>();
  const session = usePatientPortalStore((s) => s.session)!;
  const [report, setReport] = useState<FinalReport | null>(null);
  const [preview, setPreview] = useState<FinalReportPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const order = await patientPortalService.getMyOrder(session.phone, id);
      if (!order) {
        setLoading(false);
        return;
      }
      const r = await finalReportService.getPublishedForPatient(id, session.phone);
      setReport(r);
      if (r) {
        setPreview(await finalReportService.buildPreview(id));
      }
      setLoading(false);
    })();
  }, [id, session.phone]);

  if (loading) {
    return <p className="text-muted-foreground">Loading report…</p>;
  }

  if (!report) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">Your report is not available yet. It will appear here once published by our team.</p>
        <Button asChild variant="outline">
          <Link to={`/patient/orders/${id}`}>Back to order</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{report.reportNumber}</h1>
          <p className="text-sm text-muted-foreground">Published {report.publishedAt ? new Date(report.publishedAt).toLocaleString() : ''}</p>
        </div>
        <div className="flex gap-2">
          {report.pdfUrl && (
            <Button asChild>
              <a href={report.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/patient/orders/${id}`}>Back</Link>
          </Button>
        </div>
      </div>

      {preview && (
        <Card>
          <CardContent className="pt-6">
            <FinalReportPreview data={preview} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
