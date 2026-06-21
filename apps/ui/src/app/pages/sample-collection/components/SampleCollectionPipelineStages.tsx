import { cn } from '@/utils';
import type { SampleCollectionStatus } from '@/types/sampleCollection';
import {
  SAMPLE_PIPELINE_STAGES,
  formatSampleStatus,
  getStageVisualState,
  type PipelineStage,
} from '@/app/pages/sample-collection/sampleCollectionPipeline';

interface SampleCollectionPipelineStagesProps {
  currentStatus: SampleCollectionStatus;
}

function groupByPhase(stages: PipelineStage[]) {
  const groups: Array<{ phase: PipelineStage['phase']; stages: PipelineStage[] }> = [];
  for (const stage of stages) {
    const last = groups[groups.length - 1];
    if (last?.phase === stage.phase) {
      last.stages.push(stage);
    } else {
      groups.push({ phase: stage.phase, stages: [stage] });
    }
  }
  return groups;
}

export function SampleCollectionPipelineStages({ currentStatus }: SampleCollectionPipelineStagesProps) {
  const groups = groupByPhase(SAMPLE_PIPELINE_STAGES);
  const isException = ['failed', 'cancelled', 'rejected_by_lab', 'recollection_required'].includes(currentStatus);

  return (
    <div className="space-y-4">
      {isException && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm capitalize text-amber-900 dark:text-amber-100">
          Exception status: {formatSampleStatus(currentStatus)}
        </p>
      )}
      {groups.map((group) => (
        <div key={group.phase}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.phase}
          </p>
          <ol className="flex flex-wrap gap-2">
            {group.stages.map((stage) => {
              const state = getStageVisualState(stage.status, currentStatus);
              return (
                <li
                  key={stage.status}
                  className={cn(
                    'flex min-w-[7rem] flex-col rounded-md border px-2.5 py-2 text-xs',
                    state === 'complete' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                    state === 'current' && 'border-primary bg-primary/10 font-medium text-primary',
                    state === 'upcoming' && 'border-border bg-muted/30 text-muted-foreground',
                    state === 'skipped' && 'border-dashed opacity-50',
                  )}
                >
                  <span className="font-medium">{stage.label}</span>
                  <span className="mt-0.5 capitalize text-[10px] opacity-80">
                    {state === 'complete' ? 'Done' : state === 'current' ? 'Current' : 'Pending'}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
