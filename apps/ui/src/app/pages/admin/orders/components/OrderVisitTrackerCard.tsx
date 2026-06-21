import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import { FiCheck } from 'react-icons/fi';

const VISIT_STEPS: { step: TechnicianVisitStep; label: string }[] = [
  { step: 'assigned', label: 'Assigned' },
  { step: 'visit_started', label: 'En route' },
  { step: 'reached_location', label: 'At location' },
  { step: 'scan_in_progress', label: 'Scan in progress' },
  { step: 'scan_completed', label: 'Completed' },
];

const STEP_ORDER: TechnicianVisitStep[] = [
  'assigned',
  'visit_started',
  'reached_location',
  'scan_in_progress',
  'scan_completed',
];

type StepState = 'completed' | 'current' | 'pending';

function stepIndex(step: TechnicianVisitStep): number {
  if (step === 'unable_to_complete') return STEP_ORDER.length;
  const idx = STEP_ORDER.indexOf(step);
  return idx >= 0 ? idx : 0;
}

function getStepState(
  index: number,
  currentIdx: number,
  visitStep: TechnicianVisitStep,
  unable: boolean,
): StepState {
  if (unable) return 'pending';
  if (visitStep === 'scan_completed' || currentIdx > index) return 'completed';
  if (currentIdx === index) return 'current';
  return 'pending';
}

function timestampForStep(visit: TechnicianOrderVisit, step: TechnicianVisitStep): string | null {
  switch (step) {
    case 'visit_started':
      return visit.visitStartedAt ?? null;
    case 'reached_location':
      return visit.reachedAt ?? null;
    case 'scan_completed':
      return visit.completedAt ?? null;
    default:
      return null;
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const circleStyles: Record<StepState, string> = {
  completed: 'border-livotale-teal bg-livotale-teal/10 text-livotale-teal',
  current: 'border-livotale-pink bg-livotale-pink/10 text-livotale-pink ring-2 ring-livotale-pink/20',
  pending: 'border-muted bg-muted/30 text-muted-foreground',
};

function StepCircle({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
        circleStyles[state],
      )}
    >
      {state === 'completed' ? <FiCheck className="h-4 w-4" /> : index + 1}
    </span>
  );
}

interface OrderVisitTrackerCardProps {
  visit: TechnicianOrderVisit;
}

export function OrderVisitTrackerCard({ visit }: OrderVisitTrackerCardProps) {
  const currentIdx = stepIndex(visit.visitStep);
  const unable = visit.visitStep === 'unable_to_complete';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Visit status</CardTitle>
          {unable && <Badge variant="destructive">Unable to complete</Badge>}
          {visit.visitStep === 'scan_completed' && (
            <Badge variant="outline" className="border-livotale-teal/40 text-livotale-teal">
              Visit complete
            </Badge>
          )}
        </div>
        <CardDescription>Live technician field visit progress for this order.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unable && visit.unableReason && (
          <p className="text-sm text-destructive">Reason: {visit.unableReason}</p>
        )}

        {/* Mobile: vertical stepper */}
        <ol className="space-y-0 sm:hidden">
          {VISIT_STEPS.map(({ step, label }, index) => {
            const state = getStepState(index, currentIdx, visit.visitStep, unable);
            const ts = timestampForStep(visit, step);
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <StepCircle state={state} index={index} />
                  {index < VISIT_STEPS.length - 1 && (
                    <span
                      className={cn(
                        'my-1 min-h-[1.25rem] w-0.5 flex-1',
                        state === 'completed' ? 'bg-livotale-teal/50' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  )}
                </div>
                <div className={cn('min-w-0 pb-4', index === VISIT_STEPS.length - 1 && 'pb-0')}>
                  <p
                    className={cn(
                      'text-sm font-medium leading-tight',
                      state === 'current' && 'text-livotale-pink',
                      state === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </p>
                  {ts && <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(ts)}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Desktop: horizontal stepper */}
        <ol className="hidden sm:flex sm:items-start">
          {VISIT_STEPS.map(({ step, label }, index) => {
            const state = getStepState(index, currentIdx, visit.visitStep, unable);
            const ts = timestampForStep(visit, step);
            const leftLineComplete = index > 0 && getStepState(index - 1, currentIdx, visit.visitStep, unable) === 'completed';
            const rightLineComplete = state === 'completed';
            return (
              <li key={step} className="flex min-w-0 flex-1 flex-col items-center px-1">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <span
                      className={cn('h-0.5 flex-1', leftLineComplete ? 'bg-livotale-teal/50' : 'bg-border')}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                  <StepCircle state={state} index={index} />
                  {index < VISIT_STEPS.length - 1 ? (
                    <span
                      className={cn('h-0.5 flex-1', rightLineComplete ? 'bg-livotale-teal/50' : 'bg-border')}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                </div>
                <p
                  className={cn(
                    'mt-2 w-full text-center text-xs font-medium leading-snug',
                    state === 'current' && 'text-livotale-pink',
                    state === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {label}
                </p>
                {ts && (
                  <p className="mt-0.5 w-full text-center text-[10px] leading-tight text-muted-foreground">
                    {formatDateTime(ts)}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
