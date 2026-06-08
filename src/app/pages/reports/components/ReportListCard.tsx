import { Link } from 'react-router-dom';
import { FiCalendar, FiChevronRight } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportListItem } from '@/types';
import { CRITICALITY_BADGE_CLASS, CRITICALITY_LABELS, reportKindLabel } from '@/types/reports';

interface ReportListCardProps {
  report: ReportListItem;
}

export function ReportListCard({ report }: ReportListCardProps) {
  const date = report.reportDate ?? report.createdAt;

  return (
    <Link to={`/reports/${encodeURIComponent(report.reportKey)}`} className="block">
      <Card className="h-full transition-all hover:border-livotale-pink/40 hover:shadow-md">
        <CardHeader className="space-y-2 px-5 pb-2 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{report.reportCode}</p>
              <CardTitle className="mt-1 text-base">{report.title}</CardTitle>
            </div>
            <Badge className={CRITICALITY_BADGE_CLASS[report.overallCriticality]}>
              {CRITICALITY_LABELS[report.overallCriticality]}
            </Badge>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {reportKindLabel(report.reportKind)}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs">
              <FiCalendar className="h-3 w-3" />
              {new Date(date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {report.verified && <Badge variant="secondary">Verified</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end justify-between px-5 pb-5 pt-0">
          <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{report.summary}</p>
          <FiChevronRight className="ml-2 h-5 w-5 shrink-0 text-livotale-pink" />
        </CardContent>
      </Card>
    </Link>
  );
}
