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
import { journeyService } from '@/services';
import { useAppointmentsStore } from '@/store';
import type { PatientAddress } from '@/types';

interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onBooked?: () => void;
  rescheduleId?: string | null;
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function BookAppointmentModal({ open, onClose, onBooked, rescheduleId }: BookAppointmentModalProps) {
  const slots = useAppointmentsStore((s) => s.slots);
  const isSaving = useAppointmentsStore((s) => s.isSaving);
  const error = useAppointmentsStore((s) => s.error);
  const loadSlots = useAppointmentsStore((s) => s.loadSlots);
  const book = useAppointmentsStore((s) => s.book);
  const reschedule = useAppointmentsStore((s) => s.reschedule);
  const clearError = useAppointmentsStore((s) => s.clearError);

  const [date, setDate] = useState(tomorrowIso());
  const [timeSlot, setTimeSlot] = useState('');
  const [addressId, setAddressId] = useState('');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);

  useEffect(() => {
    if (!open) return;
    clearError();
    void journeyService.listAddresses().then((rows) => {
      setAddresses(rows);
      const def =
        rows.find((a) => Boolean((a as PatientAddress & { is_default?: boolean }).is_default ?? a.isDefault))
        ?? rows[0];
      if (def) setAddressId(def.id);
    });
  }, [open, clearError]);

  useEffect(() => {
    if (open && date) void loadSlots(date);
  }, [open, date, loadSlots]);

  useEffect(() => {
    if (slots.length && !timeSlot) {
      const first = slots.find((s) => s.available);
      if (first) setTimeSlot(first.code);
    }
  }, [slots, timeSlot]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || !timeSlot) return;
    try {
      if (rescheduleId) {
        await reschedule(rescheduleId, { scheduledDate: date, timeSlot });
      } else {
        await book({
          scheduledDate: date,
          timeSlot,
          addressId: addressId || undefined,
          notes: notes.trim() || undefined,
          visitType: 'initial',
        });
      }
      onBooked?.();
      onClose();
    } catch {
      /* store sets error */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-xl border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-appointment-title"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="book-appointment-title" className="text-lg font-semibold">
            {rescheduleId ? 'Reschedule visit' : 'Book home visit'}
          </h2>
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
            <Label htmlFor="visit-date">Preferred date</Label>
            <Input
              id="visit-date"
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

          {!rescheduleId && addresses.length > 0 && (
            <div className="space-y-2">
              <Label>Address</Label>
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select address" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.line1}{a.pincode ? ` · ${a.pincode}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!rescheduleId && (
            <div className="space-y-2">
              <Label htmlFor="visit-notes">Notes (optional)</Label>
              <Textarea
                id="visit-notes"
                placeholder="Gate code, parking instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving || !timeSlot}>
              {isSaving ? 'Saving…' : rescheduleId ? 'Reschedule' : 'Book now'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
