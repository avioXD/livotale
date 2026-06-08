import type { PackageWorkflowSummary } from '@/app/pages/admin/orders/orderBusinessSteps';

interface OrderPackageWorkflowHintProps {
  summary: PackageWorkflowSummary;
}

export function OrderPackageWorkflowHint({ summary }: OrderPackageWorkflowHintProps) {
  const extras: string[] = [];
  if (summary.includesPathology) extras.push('pathology');
  if (summary.includesConsultation) extras.push('doctor consult');

  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{summary.packageCode}</span>
      {' · '}
      {summary.stepCount} workflow steps
      {extras.length > 0 && (
        <>
          {' '}
          (includes {extras.join(' & ')})
        </>
      )}
      {' · '}
      {summary.stepLabels.join(' → ')}
    </p>
  );
}
