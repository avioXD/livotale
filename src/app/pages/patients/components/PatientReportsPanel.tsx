import { ReportListCard } from '@/app/pages/reports/components/ReportListCard';
import type { ReportListItem } from '@/types';

interface PatientReportsPanelProps {
  reports: ReportListItem[];
  readOnly?: boolean;
}

export function PatientReportsPanel({ reports }: PatientReportsPanelProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No clinical reports available for this patient.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {reports.map((report) => (
        <ReportListCard key={report.reportKey} report={report} />
      ))}
    </div>
  );
}
