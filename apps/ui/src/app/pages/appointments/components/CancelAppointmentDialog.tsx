import { useState, type FormEvent } from 'react';
import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppointmentsStore } from '@/store';

interface CancelAppointmentDialogProps {
  open: boolean;
  appointmentId: string;
  onClose: () => void;
  onDone?: () => void;
}

export function CancelAppointmentDialog({
  open,
  appointmentId,
  onClose,
  onDone,
}: CancelAppointmentDialogProps) {
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const cancel = useAppointmentsStore((s) => s.cancel);
  const clearError = useAppointmentsStore((s) => s.clearError);
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) return;
    try {
      await cancel(appointmentId, { reason: trimmed, reasonCode: 'patient_request' });
      onDone?.();
      onClose();
      setReason('');
    } catch {
      /* store sets error */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Cancel appointment</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              clearError();
              onClose();
            }}
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please tell us why you are cancelling"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Keep appointment
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={isSaving || reason.trim().length < 3}
            >
              {isSaving ? 'Cancelling…' : 'Cancel appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
