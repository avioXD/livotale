import { FiCheck, FiLock } from 'react-icons/fi';
import { cn } from '@/utils';
import type { OrderBusinessStepConfig, OrderBusinessStepId, OrderStepUiState } from '@/app/pages/admin/orders/orderBusinessSteps';

interface OrderWorkflowStepperProps {
  steps: OrderBusinessStepConfig[];
  activeStepId: OrderBusinessStepId;
  selectedStepId: OrderBusinessStepId;
  getUiState: (id: OrderBusinessStepId) => OrderStepUiState;
  canOpen: (id: OrderBusinessStepId) => boolean;
  onSelect: (id: OrderBusinessStepId) => void;
}

export function OrderWorkflowStepper({
  steps,
  activeStepId,
  selectedStepId,
  getUiState,
  canOpen,
  onSelect,
}: OrderWorkflowStepperProps) {
  return (
    <nav aria-label="Order workflow" className="overflow-x-auto rounded-md border bg-muted/20 p-2">
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((step, i) => {
          const state = getUiState(step.id);
          const isSelected = selectedStepId === step.id;
          const isActive = activeStepId === step.id;
          const clickable = canOpen(step.id);

          return (
            <li key={step.id} className="flex items-center">
              {i > 0 && <span className="mx-1 text-muted-foreground/50">›</span>}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(step.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  isSelected && 'border-primary bg-primary/10 text-primary',
                  !isSelected && state === 'completed' && 'border-green-200 bg-green-50 text-green-800',
                  !isSelected && state === 'active' && 'border-livotale-pink/50 bg-livotale-pink/10 text-livotale-pink',
                  !isSelected && state === 'upcoming' && 'border-border bg-muted/50 text-muted-foreground',
                  !clickable && 'cursor-not-allowed opacity-60',
                  clickable && !isSelected && 'hover:bg-accent',
                )}
              >
                {state === 'completed' && <FiCheck className="h-3 w-3 shrink-0" />}
                {state === 'upcoming' && <FiLock className="h-3 w-3 shrink-0 opacity-50" />}
                <span>{step.shortLabel}</span>
                {isActive && state === 'active' && (
                  <span className="rounded bg-livotale-pink/20 px-1 text-[10px]">current</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
