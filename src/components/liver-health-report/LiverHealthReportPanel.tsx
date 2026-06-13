import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LiverHealthReportDashboard } from '@/components/liver-health-report/LiverHealthReportDashboard';
import { liverHealthReportService } from '@/services/liverCare';
import type { LiverHealthReport } from '@/types/liverHealthReport';

interface LiverHealthReportPanelProps {
  orderId: string;
  requirePublished?: boolean;
  patientPhone?: string;
  showReferences?: boolean;
}

export function LiverHealthReportPanel({
  orderId,
  requirePublished = false,
  patientPhone,
  showReferences = false,
}: LiverHealthReportPanelProps) {
  const [report, setReport] = useState<LiverHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void liverHealthReportService
      .getForOrder(orderId, { requirePublished, patientPhone })
      .then((r) => {
        setReport(r);
        if (!r) {
          setError(
            requirePublished
              ? 'Report not published yet.'
              : 'Scan or pathology data not ready for AI report generation.',
          );
        }
      })
      .finally(() => setLoading(false));
  }, [orderId, requirePublished, patientPhone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Generating AI-hybrid liver health report…
      </div>
    );
  }

  if (!report) {
    return <p className="py-6 text-sm text-muted-foreground">{error}</p>;
  }

  return <LiverHealthReportDashboard report={report} showReferences={showReferences} />;
}
