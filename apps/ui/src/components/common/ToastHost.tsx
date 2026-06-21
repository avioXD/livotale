import { FiCheckCircle, FiX, FiXCircle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/store/toast/toastStore';

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            toast.variant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-50'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
          role="status"
        >
          {toast.variant === 'success' ? (
            <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <FiXCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <FiX className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
