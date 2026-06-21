import { cn } from '@/utils';
import type { LabWorkflowStep } from '@/app/pages/admin/orders/components/labWorkflowSteps';
import { FiCheck, FiCircle } from 'react-icons/fi';

interface LabWorkflowChecklistProps {
  steps: LabWorkflowStep[];
}

export function LabWorkflowChecklist({ steps }: LabWorkflowChecklistProps) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={cn(
            'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
            step.state === 'done' && 'border-green-200 bg-green-50/50 text-green-900',
            step.state === 'current' && 'border-livotale-pink/50 bg-livotale-pink/5 font-medium',
            step.state === 'pending' && 'border-dashed text-muted-foreground',
          )}
        >
          {step.state === 'done' ? (
            <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
          ) : (
            <FiCircle
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                step.state === 'current' ? 'text-livotale-pink' : 'text-muted-foreground/60',
              )}
              aria-hidden
            />
          )}
          <span>
            <span className="mr-1 text-xs text-muted-foreground">{index + 1}.</span>
            {step.label}
            {step.state === 'done' && (
              <span className="ml-2 text-xs font-normal text-green-700">Done</span>
            )}
            {step.state === 'current' && (
              <span className="ml-2 text-xs font-normal text-livotale-pink">In progress</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
