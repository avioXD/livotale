import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportInsightPanel } from '@/app/pages/reports/components/ReportInsightPanel';
import { ReportPdfViewer } from '@/app/pages/reports/components/ReportPdfViewer';
import { useReportsStore } from '@/store';

export function ReportDetailPage() {
  const { reportKey } = useParams<{ reportKey: string }>();
  const decodedKey = reportKey ? decodeURIComponent(reportKey) : '';

  const report = useReportsStore((s) => s.selected);
  const isLoading = useReportsStore((s) => s.isLoading);
  const error = useReportsStore((s) => s.error);
  const loadDetail = useReportsStore((s) => s.loadDetail);
  const clearSelected = useReportsStore((s) => s.clearSelected);

  useEffect(() => {
    if (decodedKey) void loadDetail(decodedKey);
    return () => clearSelected();
  }, [decodedKey, loadDetail, clearSelected]);

  const date = report?.reportDate ?? report?.createdAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/reports" aria-label="Back to reports">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{report?.title ?? 'Clinical Report'}</h2>
          {report && (
            <p className="text-sm text-muted-foreground">
              {report.reportCode}
              {date
                ? ` · ${new Date(date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`
                : ''}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && !report && (
        <p className="text-sm text-muted-foreground">Loading report insight…</p>
      )}

      {report && (
        <Tabs defaultValue="insight">
          <TabsList>
            <TabsTrigger value="insight">Insight View</TabsTrigger>
            <TabsTrigger value="pdf">Original Document</TabsTrigger>
          </TabsList>
          <TabsContent value="insight" className="mt-4">
            <ReportInsightPanel report={report} />
          </TabsContent>
          <TabsContent value="pdf" className="mt-4">
            <ReportPdfViewer pdf={report.pdf} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
