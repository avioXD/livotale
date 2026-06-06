import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useProfileStore, useUserRole } from '@/store';
import { authService } from '@/services';
import { ROLE_LABELS } from '@/rbac';
import { AppRole, type LoginLogEntry, type UserSession } from '@/types';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = useUserRole();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'profile';

  const profile = useProfileStore((state) => state.profile);
  const consents = useProfileStore((state) => state.consents);
  const isLoading = useProfileStore((state) => state.isLoading);
  const error = useProfileStore((state) => state.error);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const saveBasic = useProfileStore((state) => state.saveBasic);
  const saveEmergencyContact = useProfileStore((state) => state.saveEmergencyContact);
  const loadConsents = useProfileStore((state) => state.loadConsents);
  const acceptConsent = useProfileStore((state) => state.acceptConsent);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);

  useEffect(() => {
    void loadProfile();
    void loadConsents();
  }, [loadProfile, loadConsents]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.basic.full_name ?? '');
    setEmail(profile.basic.email ?? '');
    setMobile(profile.basic.mobile ?? '');
    setEmergencyName(profile.emergencyContact?.name ?? '');
    setEmergencyMobile(profile.emergencyContact?.mobile ?? '');
  }, [profile]);

  const loadSecurity = async () => {
    const [sessionList, logs] = await Promise.all([
      authService.listSessions(),
      authService.getLoginLogs(20),
    ]);
    setSessions(sessionList);
    setLoginLogs(logs);
  };

  const handleBasicSave = async (e: FormEvent) => {
    e.preventDefault();
    await saveBasic({ fullName, email, mobile });
  };

  const handleEmergencySave = async (e: FormEvent) => {
    e.preventDefault();
    await saveEmergencyContact({ name: emergencyName, mobile: emergencyMobile });
  };

  const isPatient = userRole === AppRole.PATIENT;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account profile, security, consent, and session management."
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

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Tabs defaultValue={defaultTab} onValueChange={(tab) => tab === 'security' && void loadSecurity()}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="profile">Basic Info</TabsTrigger>
          {isPatient && <TabsTrigger value="emergency">Emergency</TabsTrigger>}
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 max-w-lg space-y-4">
          <form onSubmit={(e) => void handleBasicSave(e)} className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </TabsContent>

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

        <TabsContent value="consent" className="mt-4 space-y-3">
          {consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consent records yet.</p>
          ) : (
            consents.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{c.purpose_name}</p>
                  <p className="text-xs text-muted-foreground">{c.purpose_code}</p>
                </div>
                {c.accepted ? (
                  <Badge>Accepted</Badge>
                ) : (
                  <Button size="sm" onClick={() => void acceptConsent(c.purpose_id)}>
                    Accept
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-6">
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
              <p className="text-sm text-muted-foreground">No login logs loaded.</p>
            ) : (
              loginLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{log.login_method}</span>
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()} · {log.ip_address ?? 'Unknown IP'}
                  </p>
                </div>
              ))
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
