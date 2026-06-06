import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnatomyBodyMap } from '@/app/pages/reports/components/AnatomyBodyMap';
import type { ReportDetail } from '@/types';
import { CRITICALITY_BADGE_CLASS, CRITICALITY_LABELS } from '@/types/reports';

interface ReportInsightPanelProps {
  report: ReportDetail;
}

export function ReportInsightPanel({ report }: ReportInsightPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {report.reportCode}
        </Badge>
        <Badge className={CRITICALITY_BADGE_CLASS[report.overallCriticality]}>
          Overall: {CRITICALITY_LABELS[report.overallCriticality]}
        </Badge>
        {report.verified && <Badge variant="secondary">Verified</Badge>}
      </div>

      <AnatomyBodyMap regions={report.bodyMap} />

      {report.sections.map((section) => (
        <Card key={section.id} className="overflow-hidden">
          <CardHeader
            className="border-b pb-3"
            style={{ borderLeftWidth: 4, borderLeftColor: section.metrics[0]?.color ?? '#94a3b8' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <Badge className={CRITICALITY_BADGE_CLASS[section.criticality]}>
                {CRITICALITY_LABELS[section.criticality]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            {section.metrics.map((metric) => (
              <div
                key={metric.code}
                className="rounded-lg border p-4 transition-shadow hover:shadow-sm"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: metric.color,
                  backgroundColor: `${metric.color}10`,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {metric.bodyRegionLabel}
                </p>
                <p className="mt-1 font-medium">{metric.name}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: metric.color }}>
                  {metric.value}
                  {metric.unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span> : null}
                </p>
                {metric.referenceRange && (
                  <p className="mt-1 text-xs text-muted-foreground">Ref: {metric.referenceRange}</p>
                )}
                <Badge className={cnBadge(metric.criticality)} variant="outline">
                  {CRITICALITY_LABELS[metric.criticality]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {report.notes && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{report.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function cnBadge(criticality: keyof typeof CRITICALITY_BADGE_CLASS) {
  return `mt-2 border ${CRITICALITY_BADGE_CLASS[criticality]}`;
}
