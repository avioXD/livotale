import { useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ReportListCard } from '@/app/pages/reports/components/ReportListCard';
import { useReportsStore } from '@/store';

export function ReportsPage() {
  const reports = useReportsStore((s) => s.reports);
  const isLoading = useReportsStore((s) => s.isLoading);
  const error = useReportsStore((s) => s.error);
  const loadReports = useReportsStore((s) => s.loadReports);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Reports"
        description="Each report has a unique ID and date. Open any report for the colorful Insight View with body scan map, or view the original PDF."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clinical reports…</p>
      ) : reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports yet. Complete a home visit or upload historical reports from your patient journey.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportListCard key={report.reportKey} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
