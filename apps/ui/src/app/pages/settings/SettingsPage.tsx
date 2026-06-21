import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common';
import { AvailabilityEditor } from '@/app/pages/doctor/appointments/components/AvailabilityEditor';
import { HolidayForm } from '@/app/pages/doctor/appointments/components/HolidayForm';
import { ChangePasswordSection } from '@/app/pages/settings/components/ChangePasswordSection';
import { MyProfilePanel } from '@/app/pages/settings/components/MyProfilePanel';
import { ProfileConsentSection } from '@/app/pages/settings/components/ProfileConsentSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useDoctorAppointmentsStore, useProfileStore, useUserRole } from '@/store';
import { toastError, toastSuccess } from '@/store/toast/toastStore';
import { authService } from '@/services';
import { ROLE_LABELS } from '@/rbac';
import { AppRole, type LoginLogEntry, type UserConsent, type UserSession } from '@/types';
import { formatLoginFailureReason, formatLoginMethod } from '@/utils/authMappers';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const SETTINGS_TABS = [
  'my-profile',
  'availability',
  'leave',
  'emergency',
  'consent',
  'security',
] as const;

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = useUserRole();
  const [activeTab, setActiveTab] = useUrlTabState({
    defaultValue: 'my-profile',
    validValues: SETTINGS_TABS,
    omitDefault: true,
  });

  const profile = useProfileStore((state) => state.profile);
  const consents = useProfileStore((state) => state.consents);
  const isLoading = useProfileStore((state) => state.isLoading);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const saveEmergencyContact = useProfileStore((state) => state.saveEmergencyContact);
  const loadConsents = useProfileStore((state) => state.loadConsents);
  const acceptConsent = useProfileStore((state) => state.acceptConsent);

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [acceptingPurposeId, setAcceptingPurposeId] = useState<string | null>(null);

  const isPatient = userRole === AppRole.PATIENT;
  const isDoctor = userRole === AppRole.DOCTOR;

  const availabilityRules = useDoctorAppointmentsStore((s) => s.availabilityRules);
  const holidays = useDoctorAppointmentsStore((s) => s.holidays);
  const doctorSaving = useDoctorAppointmentsStore((s) => s.isSaving);
  const loadAvailability = useDoctorAppointmentsStore((s) => s.loadAvailability);
  const saveAvailability = useDoctorAppointmentsStore((s) => s.saveAvailability);
  const loadHolidays = useDoctorAppointmentsStore((s) => s.loadHolidays);
  const createHoliday = useDoctorAppointmentsStore((s) => s.createHoliday);

  useEffect(() => {
    void loadProfile();
    void loadConsents();
  }, [loadProfile, loadConsents]);

  useEffect(() => {
    if (!profile) return;
    setEmergencyName(profile.emergencyContact?.name ?? '');
    setEmergencyMobile(profile.emergencyContact?.mobile ?? '');
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'security') {
      void loadSecurity();
    }
    if (isDoctor && activeTab === 'availability') {
      void loadAvailability();
    }
    if (isDoctor && activeTab === 'leave') {
      void loadHolidays();
    }
  }, [activeTab, isDoctor, loadAvailability, loadHolidays]);

  const loadSecurity = async () => {
    setSecurityError(null);
    try {
      const [sessionList, logs] = await Promise.all([
        authService.listSessions(),
        authService.getLoginLogs(20),
      ]);
      setSessions(sessionList);
      setLoginLogs(logs);
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Failed to load security data');
    }
  };

  const handleTabChange = (tab: string) => {
    if ((SETTINGS_TABS as readonly string[]).includes(tab)) {
      setActiveTab(tab as (typeof SETTINGS_TABS)[number]);
    }
  };

  const handleEmergencySave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmergencyContact({ name: emergencyName, mobile: emergencyMobile });
  };

  const handleAcceptConsent = async (consent: UserConsent) => {
    setAcceptingPurposeId(consent.purposeId);
    try {
      await acceptConsent(consent.purposeId);
      toastSuccess(`Consent saved for ${consent.purposeName}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save consent');
    } finally {
      setAcceptingPurposeId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, and account preferences."
      />

      {user && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          {user.permissions?.slice(0, 3).map((p) => (
            <Badge key={p} variant="outline" className="text-xs">
              {p}
            </Badge>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="my-profile">My profile</TabsTrigger>
          {isDoctor && <TabsTrigger value="availability">Availability</TabsTrigger>}
          {isDoctor && <TabsTrigger value="leave">Leave</TabsTrigger>}
          {isPatient && <TabsTrigger value="emergency">Emergency</TabsTrigger>}
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="my-profile" className="mt-4">
          <MyProfilePanel />
        </TabsContent>

        {isDoctor && (
          <TabsContent value="availability" className="mt-4">
            <AvailabilityEditor
              rules={availabilityRules}
              isSaving={doctorSaving}
              onSave={(rules) => saveAvailability({ rules })}
            />
          </TabsContent>
        )}

        {isDoctor && (
          <TabsContent value="leave" className="mt-4">
            <HolidayForm
              holidays={holidays}
              isSaving={doctorSaving}
              onCreate={createHoliday}
            />
          </TabsContent>
        )}

        {isPatient && (
          <TabsContent value="emergency" className="mt-4 max-w-lg space-y-4">
            <form onSubmit={(e) => void handleEmergencySave(e)} className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact name</Label>
                <Input
                  id="emergencyName"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyMobile">Contact mobile</Label>
                <Input
                  id="emergencyMobile"
                  value={emergencyMobile}
                  onChange={(e) => setEmergencyMobile(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                Save emergency contact
              </Button>
            </form>
          </TabsContent>
        )}

        <TabsContent value="consent" className="mt-4">
          <ProfileConsentSection
            consents={consents}
            isLoading={isLoading}
            acceptingPurposeId={acceptingPurposeId}
            onAccept={handleAcceptConsent}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-6">
          <ChangePasswordSection />

          {securityError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {securityError}
            </div>
          )}

          <section className="space-y-2">
            <h3 className="font-medium">Active sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions loaded.</p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{s.device_label ?? 'Device'}</p>
                  <p className="text-muted-foreground">{s.ip_address ?? 'Unknown IP'}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(s.expires_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">Recent login activity</h3>
            {loginLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login logs available.</p>
            ) : (
              loginLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{formatLoginMethod(log.login_method)}</span>
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()} · {log.ip_address ?? 'Unknown IP'}
                  </p>
                  {!log.success && log.failure_reason && (
                    <p className="mt-1 text-xs text-destructive">
                      {formatLoginFailureReason(log.failure_reason)}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
