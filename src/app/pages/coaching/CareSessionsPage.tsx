import { useEffect, useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isLogFieldValid, LogTextarea } from '@/components/forms/LogTextarea';
import { useCareAppointmentsStore } from '@/store';

const FILTERS = ['upcoming', 'today', 'completed'] as const;

export function CareSessionsPage() {
  const sessions = useCareAppointmentsStore((s) => s.sessions);
  const selected = useCareAppointmentsStore((s) => s.selected);
  const filter = useCareAppointmentsStore((s) => s.filter);
  const isLoading = useCareAppointmentsStore((s) => s.isLoading);
  const isSaving = useCareAppointmentsStore((s) => s.isSaving);
  const error = useCareAppointmentsStore((s) => s.error);
  const loadSessions = useCareAppointmentsStore((s) => s.loadSessions);
  const loadDetail = useCareAppointmentsStore((s) => s.loadDetail);
  const addNote = useCareAppointmentsStore((s) => s.addNote);
  const recommendFollowUp = useCareAppointmentsStore((s) => s.recommendFollowUp);
  const clearSelected = useCareAppointmentsStore((s) => s.clearSelected);

  const [note, setNote] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');

  useEffect(() => {
    void loadSessions(filter);
  }, [filter, loadSessions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care sessions"
        description="Dietician and health coach appointments for assigned patients."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => void loadSessions(key)}
          >
            {key === 'upcoming' ? 'Upcoming' : key === 'today' ? 'Today' : 'Completed'}
          </Button>
        ))}
      </div>

      {isLoading && sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No care sessions for this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Card key={session.id} className="cursor-pointer transition hover:border-primary/40" onClick={() => void loadDetail(session.id)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{session.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.typeName} · {session.appointmentCode}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FiCalendar className="h-4 w-4" />
                    {new Date(session.scheduledStart).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {session.status.replace(/_/g, ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.typeName}</p>
              </div>
              <Button variant="ghost" onClick={clearSelected}>Close</Button>
            </div>
            <div className="space-y-4 p-5">
              {selected.chiefComplaint && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief complaint</p>
                  <p className="mt-1 text-sm">{selected.chiefComplaint}</p>
                </div>
              )}

              <LogTextarea
                id="session-note"
                label="Session note"
                value={note}
                onChange={setNote}
                limit="LOG_MEDIUM"
                rows={3}
              />
              <Button
                size="sm"
                disabled={isSaving || !note.trim() || !isLogFieldValid(note, 'LOG_MEDIUM')}
                  onClick={() => void addNote(selected.id, note.trim()).then(() => setNote(''))}
                >
                  Save note
              </Button>

              <div className="space-y-2 border-t pt-4">
                <LogTextarea
                  id="follow-up-reason"
                  label="Recommend follow-up"
                  value={followUpReason}
                  onChange={setFollowUpReason}
                  placeholder="Reason for follow-up"
                  limit="LOG_MEDIUM"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    isSaving
                    || !followUpReason.trim()
                    || !isLogFieldValid(followUpReason, 'LOG_MEDIUM')
                  }
                  onClick={() => void recommendFollowUp(selected.id, followUpReason.trim()).then(() => setFollowUpReason(''))}
                >
                  Create follow-up task
                </Button>
              </div>

              {selected.sessionNotes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Previous notes</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selected.sessionNotes.map((entry) => (
                      <li key={entry.id} className="rounded-md border px-3 py-2">
                        {entry.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
