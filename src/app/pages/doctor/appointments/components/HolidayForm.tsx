import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorHoliday } from '@/types';

interface HolidayFormProps {
  holidays: DoctorHoliday[];
  isSaving: boolean;
  onCreate: (payload: { title: string; startDate: string; endDate: string; reason?: string }) => Promise<void>;
}

export function HolidayForm({ holidays, isSaving, onCreate }: HolidayFormProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    await onCreate({ title: title.trim(), startDate, endDate, reason: reason.trim() || undefined });
    setTitle('');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request leave</CardTitle>
          <CardDescription>Blocked dates prevent new bookings and appear on your calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-title">Title</Label>
              <Input id="holiday-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="holiday-start">Start date</Label>
                <Input id="holiday-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-end">End date</Label>
                <Input id="holiday-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-reason">Reason (optional)</Label>
              <Textarea id="holiday-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Submit leave request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved & pending leave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays scheduled.</p>
          ) : (
            holidays.map((holiday) => (
              <div key={holiday.id} className="rounded-lg border p-3">
                <p className="font-medium">{holiday.title}</p>
                <p className="text-sm text-muted-foreground">
                  {holiday.start_date} → {holiday.end_date}
                </p>
                {holiday.reason && <p className="mt-1 text-sm">{holiday.reason}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
