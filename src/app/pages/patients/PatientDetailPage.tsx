import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientContactPanel } from '@/app/pages/patients/components/PatientContactPanel';
import { PatientAppointmentsPanel } from '@/app/pages/patients/components/PatientAppointmentsPanel';
import { PatientDashboardPanel } from '@/app/pages/patients/components/PatientDashboardPanel';
import {
  AllergyPanel,
  DemographicsPanel,
  FamilyPanel,
  LiverHistoryPanel,
  MedicalHistoryPanel,
  MedicationsPanel,
} from '@/app/pages/patients/components/PatientHistoryPanels';
import { PatientReportsPanel } from '@/app/pages/patients/components/PatientReportsPanel';
import { PatientVisitsPanel } from '@/app/pages/patients/components/PatientVisitsPanel';
import { usePatientDetailStore, useAuthStore, useUserRole } from '@/store';
import { canEditPatientProfile } from '@/types/patientProfile';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const userRole = useUserRole();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const canEdit = canEditPatientProfile(userRole, userRoles);
  const defaultTab = searchParams.get('tab') ?? 'dashboard';

  const detail = usePatientDetailStore((s) => s.detail);
  const timeline = usePatientDetailStore((s) => s.timeline);
  const dashboard = usePatientDetailStore((s) => s.dashboard);
  const history = usePatientDetailStore((s) => s.history);
  const appointments = usePatientDetailStore((s) => s.appointments);
  const visits = usePatientDetailStore((s) => s.visits);
  const reports = usePatientDetailStore((s) => s.reports);
  const isLoading = usePatientDetailStore((s) => s.isLoading);
  const isSaving = usePatientDetailStore((s) => s.isSaving);
  const error = usePatientDetailStore((s) => s.error);
  const loadPatient = usePatientDetailStore((s) => s.loadPatient);
  const saveDemographics = usePatientDetailStore((s) => s.saveDemographics);
  const saveHistorySection = usePatientDetailStore((s) => s.saveHistorySection);
  const clear = usePatientDetailStore((s) => s.clear);

  useEffect(() => {
    if (id) void loadPatient(id);
    return () => clear();
  }, [id, loadPatient, clear]);

  const card = detail?.summaryCard;
  const patientId = id ?? '';

  const handleSaveHistory = async (section: string, payload: Record<string, unknown>) => {
    if (!patientId || !canEdit) return;
    await saveHistorySection(patientId, section, payload);
  };

  const panelProps = {
    patientId,
    history: history!,
    isSaving,
    readOnly: !canEdit,
    onSave: handleSaveHistory,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/patients" aria-label="Back to patients">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={card?.name ?? 'Patient Profile'}
          description={
            card
              ? `${card.patientCode} · ${card.ageGender}${canEdit ? '' : ' · View only'}`
              : 'Longitudinal medical record'
          }
        />
      </div>

      {!canEdit && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          You are viewing this profile in read-only mode. Contact operations to update records.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && !detail && (
        <p className="text-sm text-muted-foreground">Loading patient record…</p>
      )}

      {card && detail && (
        <>
        <Card className="border-livotale-pink/30 bg-gradient-to-r from-livotale-pink/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-lg">Patient Summary</CardTitle>
              <Badge variant={card.riskCategory === 'High' ? 'destructive' : 'secondary'}>
                {card.riskCategory} Risk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div><span className="text-muted-foreground">BMI</span><p className="font-medium">{card.bmi ?? '—'}</p></div>
            <div><span className="text-muted-foreground">Diagnosis / Plan</span><p className="font-medium">{card.currentPlan ?? card.diagnosis}</p></div>
            <div><span className="text-muted-foreground">Latest Liver Fibrosis Scan</span><p className="font-medium">{card.latestLiver Fibrosis ScanKpa ?? '—'} kPa</p></div>
            <div><span className="text-muted-foreground">Latest ALT</span><p className="font-medium">{card.latestAlt ?? '—'}</p></div>
            <div><span className="text-muted-foreground">Diabetes</span><p className="font-medium">{card.diabetes}</p></div>
            <div><span className="text-muted-foreground">Alcohol</span><p className="font-medium capitalize">{card.alcohol}</p></div>
            <div><span className="text-muted-foreground">Journey</span><p className="font-medium capitalize">{card.journeyStatus?.replace(/_/g, ' ')}</p></div>
            <div><span className="text-muted-foreground">Liver Score</span><p className="font-medium">{card.liverScore ?? '—'}</p></div>
          </CardContent>
          {card.alerts.length > 0 && (
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {card.alerts.map((alert) => (
                <Badge key={alert} variant="destructive" className="gap-1">
                  <FiAlertTriangle className="h-3 w-3" />
                  {alert}
                </Badge>
              ))}
            </CardContent>
          )}
          {detail.allergyAlerts.length > 0 && (
            <CardContent className="pt-0">
              <p className="mb-2 text-xs font-medium text-destructive">Allergy alerts</p>
              <div className="flex flex-wrap gap-2">
                {detail.allergyAlerts.map((a) => (
                  <Badge key={String(a.id)} variant="outline" className="border-destructive text-destructive">
                    {String(a.allergen_name)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <PatientContactPanel
          detail={detail}
          editable={canEdit}
          isSaving={isSaving}
          onSave={(payload) => saveDemographics(patientId, payload)}
        />
        </>
      )}

      {history && detail && (
        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="liver">Liver</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            {dashboard ? (
              <PatientDashboardPanel dashboard={dashboard} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading dashboard data…</p>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <PatientAppointmentsPanel
              appointments={appointments}
              detailLinkPrefix={canEdit ? '/admin/appointments' : '/appointments'}
            />
          </TabsContent>

          <TabsContent value="visits" className="mt-4">
            <PatientVisitsPanel visits={visits} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <PatientReportsPanel reports={reports} readOnly={!canEdit} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4 space-y-3">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            ) : (
              timeline.map((event, idx) => (
                <div key={`${event.id ?? idx}-${event.occurred_at}`} className="flex gap-3 rounded-lg border p-3">
                  <div className="min-w-[90px] text-xs text-muted-foreground">
                    {new Date(event.occurred_at).toLocaleString()}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {event.activity_type?.replace(/_/g, ' ')}
                      </Badge>
                      {event.role && (
                        <span className="text-xs text-muted-foreground capitalize">{event.role}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{event.description}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="demographics" className="mt-4">
            <DemographicsPanel
              detail={detail as unknown as Record<string, unknown>}
              isSaving={isSaving}
              readOnly={!canEdit}
              onSave={(payload) => saveDemographics(patientId, payload)}
            />
          </TabsContent>

          <TabsContent value="medical" className="mt-4">
            <MedicalHistoryPanel {...panelProps} />
          </TabsContent>

          <TabsContent value="liver" className="mt-4">
            <LiverHistoryPanel {...panelProps} />
          </TabsContent>

          <TabsContent value="medications" className="mt-4">
            <MedicationsPanel {...panelProps} />
          </TabsContent>

          <TabsContent value="allergies" className="mt-4 space-y-4">
            {(history.allergies ?? []).map((a) => (
              <div key={String(a.id)} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{String(a.allergen_name)}</span>
                  <Badge variant={a.alert_flag ? 'destructive' : 'outline'}>{String(a.severity ?? '—')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{String(a.allergy_type)} · {String(a.reaction_type ?? '—')}</p>
              </div>
            ))}
            {canEdit && <AllergyPanel {...panelProps} />}
          </TabsContent>

          <TabsContent value="family" className="mt-4">
            <FamilyPanel {...panelProps} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
