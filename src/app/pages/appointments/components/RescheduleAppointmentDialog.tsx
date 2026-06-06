import { useEffect, useState, type FormEvent } from 'react';
import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tomorrowIso } from '@/app/pages/appointments/wizard/bookingWizardTypes';
import { useAppointmentsStore } from '@/store';
import type { AppointmentSummary } from '@/types';

interface RescheduleAppointmentDialogProps {
  open: boolean;
  appointment: AppointmentSummary;
  onClose: () => void;
  onDone?: () => void;
}

export function RescheduleAppointmentDialog({
  open,
  appointment,
  onClose,
  onDone,
}: RescheduleAppointmentDialogProps) {
  const slots = useAppointmentsStore((s) => s.slots);
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const loadSlots = useAppointmentsStore((s) => s.loadSlots);
  const reschedule = useAppointmentsStore((s) => s.reschedule);
  const clearError = useAppointmentsStore((s) => s.clearError);

  const [date, setDate] = useState(tomorrowIso());
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    clearError();
    setDate(tomorrowIso());
    setTimeSlot('');
    setReason('');
  }, [open, clearError]);

  useEffect(() => {
    if (!open || !date) return;
    void loadSlots(date, {
      typeCode: appointment.unified?.typeCode ?? appointment.visitType,
      visitMode: appointment.unified?.visitMode ?? appointment.visitMode ?? 'home',
    });
  }, [open, date, loadSlots, appointment]);

  useEffect(() => {
    if (slots.length && !timeSlot) {
      const first = slots.find((s) => s.available);
      if (first) setTimeSlot(first.code);
    }
  }, [slots, timeSlot]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!date || !timeSlot || trimmed.length < 3) return;
    try {
      await reschedule(appointment.id, {
        scheduledDate: date,
        timeSlot,
        reason: trimmed,
      });
      onDone?.();
      onClose();
    } catch {
      /* store sets error */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Reschedule appointment</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
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
            <Label htmlFor="reschedule-date">New date</Label>
            <Input
              id="reschedule-date"
              type="date"
              min={tomorrowIso()}
              value={date}
              onChange={(e) => {
                setTimeSlot('');
                setDate(e.target.value);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Time slot</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select a slot" />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.code} value={slot.code} disabled={!slot.available}>
                    {slot.label}{!slot.available ? ' (unavailable)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule-reason">Reason *</Label>
            <Textarea
              id="reschedule-reason"
              placeholder="Why are you rescheduling?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              minLength={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving || !timeSlot || reason.trim().length < 3}
            >
              {isSaving ? 'Saving…' : 'Reschedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
