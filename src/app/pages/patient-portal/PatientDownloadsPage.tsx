import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { PatientDownloadItem } from '@/types/patientPortal';

const TYPE_LABELS: Record<PatientDownloadItem['type'], string> = {
  invoice: 'Invoice',
  report: 'Report',
  prescription: 'Prescription',
};

export function PatientDownloadsPage() {
  const session = usePatientPortalStore((s) => s.session)!;
  const [downloads, setDownloads] = useState<PatientDownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void patientPortalService.listDownloads(session.phone).then((rows) => {
      setDownloads(rows);
      setLoading(false);
    });
  }, [session.phone]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Download center</h1>
          <p className="text-muted-foreground">
            Invoices, published reports, and prescriptions — only available assets are shown.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/patient">Back</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : downloads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No downloads available yet. Reports and prescriptions appear after our team publishes them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {downloads.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.label}</p>
                    <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.orderNumber} · {new Date(item.availableAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {item.type === 'report' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/patient/orders/${item.orderId}/report`}>View</Link>
                    </Button>
                  )}
                  {item.type === 'prescription' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/patient/orders/${item.orderId}/prescription`}>View</Link>
                    </Button>
                  )}
                  <Button size="sm" asChild>
                    <a href={item.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
