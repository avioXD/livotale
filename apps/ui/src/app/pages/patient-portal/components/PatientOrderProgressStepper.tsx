import { FiCheck, FiCircle } from 'react-icons/fi';
import type { PatientProgressStep } from '@/services/liverCare/patientOrderProgress';
import { cn } from '@/utils';

interface PatientOrderProgressStepperProps {
  steps: PatientProgressStep[];
  compact?: boolean;
}

const stateStyles: Record<string, string> = {
  completed: 'border-livotale-teal bg-livotale-teal/10 text-livotale-teal',
  current: 'border-livotale-pink bg-livotale-pink/10 text-livotale-pink ring-2 ring-livotale-pink/20',
  pending: 'border-muted bg-muted/30 text-muted-foreground',
};

function StepNode({ step }: { step: PatientProgressStep }) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
        stateStyles[step.state] ?? stateStyles.pending,
      )}
    >
      {step.state === 'completed' ? (
        <FiCheck className="h-3.5 w-3.5" />
      ) : (
        <FiCircle className="h-2 w-2 fill-current" />
      )}
    </span>
  );
}

export function PatientOrderProgressStepper({ steps, compact }: PatientOrderProgressStepperProps) {
  return (
    <>
      {/* Vertical — mobile default */}
      <ol className={cn('space-y-0 sm:hidden', compact ? 'space-y-1' : 'space-y-2')}>
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepNode step={step} />
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    'my-1 min-h-[1rem] w-0.5 flex-1',
                    step.state === 'completed' ? 'bg-livotale-teal/40' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('pb-2', compact && 'pb-1')}>
              <p
                className={cn(
                  'text-sm font-medium leading-tight',
                  step.state === 'current' && 'text-livotale-pink',
                  step.state === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* Horizontal scroll — sm+ */}
      <nav aria-label="Order progress" className="hidden overflow-x-auto sm:block">
        <ol className="flex min-w-max items-center gap-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              {index > 0 && (
                <span
                  className={cn(
                    'mx-1 h-0.5 w-6',
                    steps[index - 1]?.state === 'completed' ? 'bg-livotale-teal/40' : 'bg-border',
                  )}
                />
              )}
              <div className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-1">
                <StepNode step={step} />
                <span
                  className={cn(
                    'whitespace-nowrap text-xs font-medium',
                    step.state === 'current' && 'text-livotale-pink',
                    step.state === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
