import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PatientAppointmentsPanel,
  PatientOrdersPanel,
  PatientPaymentsPanel,
  PatientReportsPanel,
  PatientScansPanel,
  PatientTestsPanel,
} from '@/app/pages/patients/components/PatientClinicalPanels';
import { PatientProfilePanel } from '@/app/pages/patients/components/PatientProfilePanel';
import { usePatientDetailStore, useAuthStore, useUserRole } from '@/store';
import { canEditPatientProfile } from '@/types/patientProfile';
import { PATIENT_DETAIL_TABS, type PatientDetailTab } from '@/types/patientClinical';
import { orgPath } from '@/app/config/orgRoutes';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const PATIENT_TABS = PATIENT_DETAIL_TABS.map((t) => t.value);

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useUrlTabState({
    defaultValue: 'profile',
    validValues: PATIENT_TABS,
    omitDefault: true,
  });
  const userRole = useUserRole();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const canEdit = canEditPatientProfile(userRole, userRoles);
  const detail = usePatientDetailStore((s) => s.detail);
  const history = usePatientDetailStore((s) => s.history);
  const clinical = usePatientDetailStore((s) => s.clinical);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={orgPath('/patients')} aria-label="Back to patients">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={card?.name ?? 'Patient profile'}
          description={
            card
              ? `${card.patientCode} · ${card.ageGender}${canEdit ? '' : ' · View only'}`
              : 'Medical record'
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

      {detail && history && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PatientDetailTab)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            {PATIENT_DETAIL_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <PatientProfilePanel
              detail={detail}
              history={history}
              patientId={patientId}
              canEdit={canEdit}
              isSaving={isSaving}
              onSaveDemographics={(payload) => saveDemographics(patientId, payload)}
              onSaveHistory={handleSaveHistory}
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <PatientOrdersPanel orders={clinical?.orders ?? []} />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PatientPaymentsPanel payments={clinical?.payments ?? []} />
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <PatientAppointmentsPanel appointments={clinical?.appointments ?? []} />
          </TabsContent>

          <TabsContent value="tests" className="mt-4">
            <PatientTestsPanel reports={clinical?.pathologyReports ?? []} />
          </TabsContent>

          <TabsContent value="scans" className="mt-4">
            <PatientScansPanel scans={clinical?.scans ?? []} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <PatientReportsPanel reports={clinical?.reports ?? []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
