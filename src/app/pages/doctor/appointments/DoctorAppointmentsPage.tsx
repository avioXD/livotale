import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentTimeline } from '@/app/pages/appointments/components/AppointmentTimeline';
import { AvailabilityEditor } from '@/app/pages/doctor/appointments/components/AvailabilityEditor';
import { ConsultationPanel } from '@/app/pages/doctor/appointments/components/ConsultationPanel';
import { DoctorCalendarView } from '@/app/pages/doctor/appointments/components/DoctorCalendarView';
import { HolidayForm } from '@/app/pages/doctor/appointments/components/HolidayForm';
import { PatientSummaryDrawer } from '@/app/pages/doctor/appointments/components/PatientSummaryDrawer';
import { PrescriptionBuilderPanel } from '@/app/pages/doctor/appointments/components/PrescriptionBuilderPanel';
import { SignatureUploadPanel } from '@/app/pages/doctor/appointments/components/SignatureUploadPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDoctorAppointmentsStore } from '@/store';
import type { DoctorCalendarView as CalendarViewMode } from '@/types';

const VIEW_MODES: CalendarViewMode[] = ['day', 'week', 'month', 'list'];

export function DoctorAppointmentsPage() {
  const calendar = useDoctorAppointmentsStore((s) => s.calendar);
  const selected = useDoctorAppointmentsStore((s) => s.selected);
  const availabilityRules = useDoctorAppointmentsStore((s) => s.availabilityRules);
  const holidays = useDoctorAppointmentsStore((s) => s.holidays);
  const isLoading = useDoctorAppointmentsStore((s) => s.isLoading);
  const isSaving = useDoctorAppointmentsStore((s) => s.isSaving);
  const error = useDoctorAppointmentsStore((s) => s.error);
  const loadCalendar = useDoctorAppointmentsStore((s) => s.loadCalendar);
  const loadDetail = useDoctorAppointmentsStore((s) => s.loadDetail);
  const loadAvailability = useDoctorAppointmentsStore((s) => s.loadAvailability);
  const saveAvailability = useDoctorAppointmentsStore((s) => s.saveAvailability);
  const loadHolidays = useDoctorAppointmentsStore((s) => s.loadHolidays);
  const createHoliday = useDoctorAppointmentsStore((s) => s.createHoliday);
  const startConsultation = useDoctorAppointmentsStore((s) => s.startConsultation);
  const completeConsultation = useDoctorAppointmentsStore((s) => s.completeConsultation);
  const markNoShow = useDoctorAppointmentsStore((s) => s.markNoShow);
  const requestReschedule = useDoctorAppointmentsStore((s) => s.requestReschedule);
  const clearSelected = useDoctorAppointmentsStore((s) => s.clearSelected);
  const prescriptionBundle = useDoctorAppointmentsStore((s) => s.prescriptionBundle);
  const prescriptionPdf = useDoctorAppointmentsStore((s) => s.prescriptionPdf);
  const loadPrescription = useDoctorAppointmentsStore((s) => s.loadPrescription);
  const savePrescription = useDoctorAppointmentsStore((s) => s.savePrescription);
  const approvePrescription = useDoctorAppointmentsStore((s) => s.approvePrescription);
  const saveSignature = useDoctorAppointmentsStore((s) => s.saveSignature);

  const [tab, setTab] = useState<'calendar' | 'availability' | 'holidays'>('calendar');
  const [view, setView] = useState<CalendarViewMode>('week');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (tab === 'calendar') void loadCalendar({ view, date });
  }, [tab, view, date, loadCalendar]);

  useEffect(() => {
    if (tab === 'availability') void loadAvailability();
    if (tab === 'holidays') void loadHolidays();
  }, [tab, loadAvailability, loadHolidays]);

  useEffect(() => {
    if (selected?.id) void loadPrescription(selected.id);
  }, [selected?.id, loadPrescription]);

  const openDetail = async (id: string) => {
    await loadDetail(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor calendar"
        description="Manage availability, view assigned appointments, and run consultations."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['calendar', 'availability', 'holidays'] as const).map((key) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(key)}
          >
            {key === 'calendar' ? 'Calendar' : key === 'availability' ? 'Availability' : 'Holidays'}
          </Button>
        ))}
      </div>

      {tab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Date</p>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            </div>
            <div className="flex flex-wrap gap-2">
              {VIEW_MODES.map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={view === mode ? 'default' : 'outline'}
                  onClick={() => setView(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : (
            <DoctorCalendarView
              view={view}
              date={date}
              appointments={calendar?.appointments ?? []}
              onSelect={(id) => void openDetail(id)}
            />
          )}
        </div>
      )}

      {tab === 'availability' && (
        <AvailabilityEditor
          rules={availabilityRules}
          isSaving={isSaving}
          onSave={(rules) => saveAvailability({ rules })}
        />
      )}

      {tab === 'holidays' && (
        <HolidayForm holidays={holidays} isSaving={isSaving} onCreate={createHoliday} />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.appointmentCode}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearSelected} aria-label="Close">
                <FiX className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize">{selected.typeName}</Badge>
                <Badge variant="outline" className="capitalize">
                  {selected.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <PatientSummaryDrawer appointment={selected} />

              <ConsultationPanel
                appointment={selected}
                isSaving={isSaving}
                onStart={() => startConsultation(selected.id)}
                onComplete={(summary) => completeConsultation(selected.id, summary)}
                onNoShow={(reason) => markNoShow(selected.id, reason)}
                onRequestReschedule={(reason) => requestReschedule(selected.id, reason)}
              />

              <SignatureUploadPanel
                isSaving={isSaving}
                onSave={(payload) => saveSignature(payload)}
              />

              <PrescriptionBuilderPanel
                key={`${selected.id}-${prescriptionBundle?.prescription?.id ?? 'new'}-${prescriptionBundle?.prescription?.status ?? 'draft'}`}
                bundle={prescriptionBundle}
                isSaving={isSaving}
                onSave={(payload) => savePrescription(selected.id, payload)}
                onApprove={(payload) => approvePrescription(selected.id, payload)}
              />

              {prescriptionPdf && (
                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
                  <p className="font-medium">Prescription PDF ready</p>
                  <p className="text-muted-foreground">
                    {prescriptionPdf.prescriptionNumber} · verify {prescriptionPdf.qrVerificationCode.slice(0, 8)}…
                  </p>
                  <Button variant="link" className="h-auto p-0" asChild>
                    <a href={prescriptionPdf.downloadUrl} target="_blank" rel="noreferrer">
                      Open PDF
                    </a>
                  </Button>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                <AppointmentTimeline
                  events={[]}
                  unifiedTimeline={selected.timeline}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
