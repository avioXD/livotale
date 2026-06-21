import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentTimeline } from '@/app/pages/appointments/components/AppointmentTimeline';
import { AvailabilityEditor } from '@/app/pages/doctor/appointments/components/AvailabilityEditor';
import { ConsultationPanel } from '@/app/pages/doctor/appointments/components/ConsultationPanel';
import { DoctorAppointmentsListPanel } from '@/app/pages/doctor/appointments/components/DoctorAppointmentsListPanel';
import { DoctorCalendarView } from '@/app/pages/doctor/appointments/components/DoctorCalendarView';
import { HolidayForm } from '@/app/pages/doctor/appointments/components/HolidayForm';
import { PatientSummaryDrawer } from '@/app/pages/doctor/appointments/components/PatientSummaryDrawer';
import { PrescriptionBuilderPanel } from '@/app/pages/doctor/appointments/components/PrescriptionBuilderPanel';
import { SignatureUploadPanel } from '@/app/pages/doctor/appointments/components/SignatureUploadPanel';
import { DOCTOR_SECTIONS, type DoctorSection } from '@/app/pages/doctor/doctorHubConfig';
import { orgPath } from '@/app/config/orgRoutes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDoctorAppointmentsStore } from '@/store';
import type { DoctorCalendarView as CalendarViewMode } from '@/types';

const VIEW_MODES: CalendarViewMode[] = ['day', 'week', 'month'];

function parseSection(value: string | null): DoctorSection {
  if (value === 'availability' || value === 'leave') return value;
  return 'appointments';
}

export function DoctorAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const section = parseSection(searchParams.get('section'));

  const calendar = useDoctorAppointmentsStore((s) => s.calendar);
  const appointments = useDoctorAppointmentsStore((s) => s.appointments);
  const selected = useDoctorAppointmentsStore((s) => s.selected);
  const availabilityRules = useDoctorAppointmentsStore((s) => s.availabilityRules);
  const holidays = useDoctorAppointmentsStore((s) => s.holidays);
  const isLoading = useDoctorAppointmentsStore((s) => s.isLoading);
  const isSaving = useDoctorAppointmentsStore((s) => s.isSaving);
  const error = useDoctorAppointmentsStore((s) => s.error);
  const loadCalendar = useDoctorAppointmentsStore((s) => s.loadCalendar);
  const loadList = useDoctorAppointmentsStore((s) => s.loadList);
  const loadDetail = useDoctorAppointmentsStore((s) => s.loadDetail);
  const loadAvailability = useDoctorAppointmentsStore((s) => s.loadAvailability);
  const saveAvailability = useDoctorAppointmentsStore((s) => s.saveAvailability);
  const loadHolidays = useDoctorAppointmentsStore((s) => s.loadHolidays);
  const createHoliday = useDoctorAppointmentsStore((s) => s.createHoliday);
  const startConsultation = useDoctorAppointmentsStore((s) => s.startConsultation);
  const completeConsultation = useDoctorAppointmentsStore((s) => s.completeConsultation);
  const markNoShow = useDoctorAppointmentsStore((s) => s.markNoShow);
  const requestReschedule = useDoctorAppointmentsStore((s) => s.requestReschedule);
  const updateClinicalData = useDoctorAppointmentsStore((s) => s.updateClinicalData);
  const clearSelected = useDoctorAppointmentsStore((s) => s.clearSelected);
  const prescriptionBundle = useDoctorAppointmentsStore((s) => s.prescriptionBundle);
  const prescriptionPdf = useDoctorAppointmentsStore((s) => s.prescriptionPdf);
  const loadPrescription = useDoctorAppointmentsStore((s) => s.loadPrescription);
  const savePrescription = useDoctorAppointmentsStore((s) => s.savePrescription);
  const approvePrescription = useDoctorAppointmentsStore((s) => s.approvePrescription);
  const saveSignature = useDoctorAppointmentsStore((s) => s.saveSignature);

  const [listFilter, setListFilter] = useState<'today' | 'upcoming' | 'completed' | 'missed'>('upcoming');
  const [displayMode, setDisplayMode] = useState<'table' | 'calendar'>('table');
  const [view, setView] = useState<CalendarViewMode>('week');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const sectionMeta = DOCTOR_SECTIONS.find((s) => s.key === section)!;

  useEffect(() => {
    if (section !== 'appointments') return;
    if (displayMode === 'calendar') {
      void loadCalendar({ view, date });
    } else {
      void loadList(listFilter);
    }
  }, [section, displayMode, view, date, listFilter, loadCalendar, loadList]);

  useEffect(() => {
    if (section === 'availability') void loadAvailability();
    if (section === 'leave') void loadHolidays();
  }, [section, loadAvailability, loadHolidays]);

  useEffect(() => {
    if (selected?.id) void loadPrescription(selected.id);
  }, [selected?.id, loadPrescription]);

  const openDetail = async (id: string) => {
    await loadDetail(id);
  };

  const listRows = displayMode === 'calendar' ? (calendar?.appointments ?? []) : appointments;

  return (
    <div className="space-y-6">
      <PageHeader title={sectionMeta.label} description={sectionMeta.description} />

      {section === 'appointments' && (
        <div className="rounded-md border border-livotale-pink/30 bg-livotale-pink/5 px-4 py-3 text-sm">
          <span className="font-medium">Liver care PKG-3 consultations</span>
          {' '}use the order-based workflow — review scan, pathology, and publish prescriptions from{' '}
          <Link to={orgPath('/doctor/consultations')} className="font-medium text-primary underline">
            Liver care Rx
          </Link>
          .
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {section === 'appointments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={displayMode === 'table' ? 'default' : 'outline'}
              onClick={() => setDisplayMode('table')}
            >
              Table
            </Button>
            <Button
              size="sm"
              variant={displayMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setDisplayMode('calendar')}
            >
              Calendar
            </Button>
          </div>

          {displayMode === 'table' ? (
            <DoctorAppointmentsListPanel
              appointments={listRows}
              isLoading={isLoading}
              listFilter={listFilter}
              onFilterChange={setListFilter}
              onSelect={(id) => void openDetail(id)}
            />
          ) : (
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
        </div>
      )}

      {section === 'availability' && (
        <AvailabilityEditor
          rules={availabilityRules}
          isSaving={isSaving}
          onSave={(rules) => saveAvailability({ rules })}
        />
      )}

      {section === 'leave' && (
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
                onSaveClinicalData={(payload) => updateClinicalData(selected.id, payload)}
              />

              <SignatureUploadPanel
                isSaving={isSaving}
                onSave={(payload) => saveSignature(payload)}
              />

              <PrescriptionBuilderPanel
                key={`${selected.id}-${prescriptionBundle?.prescription?.id ?? 'new'}-${prescriptionBundle?.prescription?.status ?? 'draft'}-${selected.chiefComplaint ?? ''}`}
                bundle={prescriptionBundle}
                appointmentChiefComplaint={selected.chiefComplaint ?? undefined}
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
                <AppointmentTimeline events={[]} unifiedTimeline={selected.timeline} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
