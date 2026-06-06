import { cn } from '@/lib/utils';
import { FiCheck, FiCircle } from 'react-icons/fi';
import type { AppointmentProgressStep } from '@/types';

interface AppointmentStatusStepperProps {
  steps: AppointmentProgressStep[];
  compact?: boolean;
}

const stateStyles: Record<string, string> = {
  completed: 'border-livotel-teal bg-livotel-teal/10 text-livotel-teal',
  current: 'border-livotel-pink bg-livotel-pink/10 text-livotel-pink ring-2 ring-livotel-pink/20',
  pending: 'border-muted bg-muted/30 text-muted-foreground',
  cancelled: 'border-destructive bg-destructive/10 text-destructive',
  skipped: 'border-transparent bg-muted/20 text-muted-foreground/50',
};

export function AppointmentStatusStepper({ steps, compact }: AppointmentStatusStepperProps) {
  return (
    <ol className={cn('space-y-0', compact ? 'space-y-2' : 'space-y-3')}>
      {steps.map((step, index) => (
        <li key={step.code} className="flex gap-3">
          <div className="flex flex-col items-center">
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
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'my-1 w-0.5 flex-1 min-h-[1.25rem]',
                  step.state === 'completed' ? 'bg-livotel-teal/40' : 'bg-border',
                )}
              />
            )}
          </div>
          <div className={cn('pb-3', compact && 'pb-1')}>
            <p
              className={cn(
                'text-sm font-medium leading-tight',
                step.state === 'current' && 'text-livotel-pink',
                step.state === 'pending' && 'text-muted-foreground',
              )}
            >
              {step.label}
            </p>
            {step.occurredAt && !compact && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(step.occurredAt).toLocaleString()}
              </p>
            )}
            {step.state === 'current' && (
              <p className="mt-1 text-xs font-medium text-livotel-pink">Current step</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
