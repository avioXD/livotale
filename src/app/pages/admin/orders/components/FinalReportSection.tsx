import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aiExtractionOrderService, finalReportService } from '@/services/liverCare';
import { FinalReportPreview } from '@/app/pages/admin/orders/components/FinalReportPreview';
import type { FinalReport } from '@/types/finalReport';
import type { FinalReportPreviewData } from '@/types/finalReport';
import { REPORT_TYPE_LABELS } from '@/types/finalReport';

interface FinalReportSectionProps {
  orderId: string;
  pathologyRequired: boolean;
  /** When true, shown below AI review on the Lab report step (not a separate workflow step). */
  embeddedInLab?: boolean;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function FinalReportSection({
  orderId,
  pathologyRequired,
  embeddedInLab = false,
  onUpdated,
  readOnly = false,
}: FinalReportSectionProps) {
  const [report, setReport] = useState<FinalReport | null>(null);
  const [aiVerified, setAiVerified] = useState(false);
  const [preview, setPreview] = useState<FinalReportPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [r, job] = await Promise.all([
      finalReportService.getForOrder(orderId),
      pathologyRequired ? aiExtractionOrderService.getJobForOrder(orderId) : Promise.resolve(null),
    ]);
    setReport(r);
    setAiVerified(!pathologyRequired || job?.status === 'verified');
  };

  useEffect(() => {
    void load();
  }, [orderId, pathologyRequired]);

  const run = async (action: () => Promise<unknown>) => {
    setActing(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const handlePreview = async () => {
    setActing(true);
    setError(null);
    try {
      const data = await finalReportService.buildPreview(orderId);
      setPreview(data);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Livotale letterhead report PDF</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate the branded PDF on Livotale letterhead — fibrosis scan
          {pathologyRequired ? ' plus verified lab parameters from the database' : ''}. Publish to patient portal when ready.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!readOnly && pathologyRequired && !aiVerified && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {embeddedInLab
              ? 'Confirm AI-extracted lab parameters above before generating the letterhead PDF.'
              : 'Confirm AI-extracted lab parameters before generating the letterhead PDF.'}
          </p>
        )}

        {report && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{report.reportNumber}</span>
            <Badge className="capitalize">{report.status}</Badge>
            <span className="text-muted-foreground">v{report.version}</span>
            <span className="text-muted-foreground">{REPORT_TYPE_LABELS[report.reportType]}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {report?.pdfUrl ? (
            <Button size="sm" variant="secondary" asChild>
              <a href={report.pdfUrl} target="_blank" rel="noreferrer">Download letterhead PDF</a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Letterhead PDF not generated yet.</p>
          )}
          {!readOnly && (
            <>
              <Button size="sm" variant="outline" disabled={acting || (pathologyRequired && !aiVerified)} onClick={handlePreview}>
                Preview letterhead
              </Button>
              <Button
                size="sm"
                disabled={acting || (pathologyRequired && !aiVerified)}
                onClick={() => run(() => finalReportService.generate(orderId))}
              >
                Generate letterhead PDF
              </Button>
              {report && report.status === 'generated' && (
                <Button
                  size="sm"
                  disabled={acting}
                  onClick={() => run(() => finalReportService.publish(orderId))}
                >
                  Publish to patient portal
                </Button>
              )}
              {report && report.status === 'published' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => run(() => finalReportService.lock(orderId))}
                >
                  Lock report
                </Button>
              )}
            </>
          )}
          {readOnly && report && (
            <Button size="sm" variant="outline" disabled={acting} onClick={handlePreview}>
              Preview letterhead
            </Button>
          )}
        </div>

        {report?.publishedAt && (
          <p className="text-sm text-green-700">
            Published {new Date(report.publishedAt).toLocaleString()} — visible to patient
          </p>
        )}

        {showPreview && preview && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Letterhead preview</p>
            <FinalReportPreview data={preview} />
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>Hide preview</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
