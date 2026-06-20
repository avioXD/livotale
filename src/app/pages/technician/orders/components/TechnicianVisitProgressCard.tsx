import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TechnicianVisitStep } from '@/types/fibrosisScan';
import { cn } from '@/utils';

const STEP_ORDER: TechnicianVisitStep[] = [
  'assigned',
  'visit_started',
  'reached_location',
  'scan_in_progress',
  'scan_completed',
];

const STEP_LABELS: Record<TechnicianVisitStep, string> = {
  assigned: 'Assigned',
  visit_started: 'En route',
  reached_location: 'At location',
  scan_in_progress: 'Scanning',
  scan_completed: 'Done',
  unable_to_complete: 'Unable',
};

interface TechnicianVisitProgressCardProps {
  currentStep: TechnicianVisitStep;
  acting: boolean;
  onStartVisit: () => void;
  onMarkReached: () => void;
  canCompleteScan: boolean;
}

function stepIndex(step: TechnicianVisitStep): number {
  if (step === 'unable_to_complete') return -1;
  return STEP_ORDER.indexOf(step);
}

export function TechnicianVisitProgressCard({
  currentStep,
  acting,
  onStartVisit,
  onMarkReached,
  canCompleteScan,
}: TechnicianVisitProgressCardProps) {
  const currentIdx = stepIndex(currentStep);

  if (currentStep === 'unable_to_complete') return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Visit status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STEP_ORDER.map((step, i) => (
            <div
              key={step}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                i < currentIdx
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : i === currentIdx
                    ? 'bg-livotale-pink/15 text-livotale-pink ring-1 ring-livotale-pink/30'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {STEP_LABELS[step]}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {currentStep === 'assigned' && (
            <Button className="w-full sm:w-auto" size="sm" disabled={acting} onClick={onStartVisit}>
              Start visit
            </Button>
          )}
          {(currentStep === 'visit_started' || currentStep === 'assigned') && (
            <Button className="w-full sm:w-auto" size="sm" disabled={acting} onClick={onMarkReached}>
              Mark reached location
            </Button>
          )}
        </div>
        {!canCompleteScan && currentStep !== 'scan_completed' && currentIdx >= 2 && (
          <p className="text-xs text-muted-foreground">
            Finish steps 1–3 (intake, FibroScan intake, scan + report proof), then complete step 4 below with a
            patient OTP.
          </p>
        )}
        {canCompleteScan && currentStep !== 'scan_completed' && currentIdx >= 2 && (
          <p className="text-xs text-muted-foreground">
            Steps 1–3 are done. Use step 4 below to send a completion OTP to the patient and verify it to close
            the visit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
