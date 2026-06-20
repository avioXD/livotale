import { useEffect, useState, type FormEvent } from 'react';
import { FiEdit2, FiEye, FiLock } from 'react-icons/fi';
import { StaffLegalDocumentsPanel } from '@/app/pages/staff/profile/components/StaffLegalDocumentsPanel';
import { OperationsScopeFields } from '@/app/pages/staff/profile/components/OperationsScopeFields';
import {
  BASIC_IDENTITY_FIELD_KEYS,
  canEditStaffField,
  staffProfileConfig,
} from '@/app/pages/staff/profile/staffProfileConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { DOCTOR_LANGUAGES } from '@/app/config/doctorLanguages';
import { serviceZoneService } from '@/services/orgScope/ServiceZoneService';
import type { ServiceZone } from '@/types/serviceZone';
import type { StaffDocumentType, StaffFullProfile } from '@/types/staffProfile';

type ProfileSection = 'employment' | 'address' | 'legal';

const PROFILE_SECTIONS = ['employment', 'address', 'legal'] as const;

interface StaffEmployeeProfileViewProps {
  profile: StaffFullProfile;
  actor: 'self' | 'admin';
  section?: ProfileSection;
  embedded?: boolean;
  isSaving?: boolean;
  usingDemo?: boolean;
  onSave?: (payload: Record<string, unknown>) => void | Promise<void>;
  onUploadDocument?: (
    file: File,
    meta: {
      documentType: StaffDocumentType;
      documentNumber?: string;
      issuedOn?: string;
      expiresOn?: string;
      notes?: string;
    },
  ) => void | Promise<void>;
  onVerifyDocument?: (
    documentId: string,
    status: 'verified' | 'rejected' | 'expired',
    notes?: string,
  ) => void | Promise<void>;
  onMarkVerified?: () => void | Promise<void>;
}

export function StaffEmployeeProfileView({
  profile,
  actor,
  section,
  embedded = false,
  isSaving = false,
  usingDemo = false,
  onSave,
  onUploadDocument,
  onVerifyDocument,
  onMarkVerified,
}: StaffEmployeeProfileViewProps) {
  const config = staffProfileConfig(profile.role);
  const emp = profile.employee;
  const [activeSection, setActiveSection] = useUrlTabState({
    param: 'profileSection',
    defaultValue: 'employment',
    validValues: PROFILE_SECTIONS,
    omitDefault: true,
  });
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(actor === 'self' ? 'edit' : 'edit');
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);

  const readStringList = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

  const [form, setForm] = useState({
    fullName: profile.fullName,
    email: profile.email ?? '',
    mobile: profile.mobile ?? '',
    gender: profile.gender ?? '',
    dob: profile.dob?.slice(0, 10) ?? '',
    verificationStatus: profile.verificationStatus,
    status: profile.status,
    joinedOn: emp?.joinedOn?.slice(0, 10) ?? '',
    qualification: emp?.qualification ?? '',
    certification: emp?.certification ?? '',
    registrationNumber: emp?.registrationNumber ?? '',
    specialization: emp?.specialization ?? '',
    clinicOrOrgName: emp?.clinicOrOrgName ?? '',
    additionalNotes: emp?.additionalNotes ?? '',
    homeLine1: emp?.homeLine1 ?? '',
    homeLine2: emp?.homeLine2 ?? '',
    homeCity: emp?.homeCity ?? '',
    homeState: emp?.homeState ?? '',
    homePincode: emp?.homePincode ?? '',
    emergencyContactName: emp?.emergencyContactName ?? '',
    emergencyContactMobile: emp?.emergencyContactMobile ?? '',
    emergencyContactRelation: emp?.emergencyContactRelation ?? '',
    vehicleType: emp?.vehicleType ?? '',
    vehicleNumber: emp?.vehicleNumber ?? '',
    assignedServiceZoneIds: readStringList(profile.meta?.assignedServiceZoneIds),
    assignedPincodes: readStringList(profile.meta?.assignedPincodes),
    cityManagerServiceZoneIds: readStringList(profile.meta?.cityManagerServiceZoneIds),
    languagesKnown: Array.isArray(profile.meta?.languagesKnown)
      ? (profile.meta.languagesKnown as string[])
      : Array.isArray(emp?.languagesKnown)
        ? emp.languagesKnown
        : [],
  });

  useEffect(() => {
    if (profile.role !== 'operations' || actor !== 'admin') return;
    void serviceZoneService.list().then(setServiceZones).catch(() => setServiceZones([]));
  }, [profile.role, actor]);

  const editable = (key: string) =>
    canEditStaffField(profile.role, key, actor, viewMode);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (viewMode !== 'edit' || !onSave) return;

    const payload: Record<string, unknown> = {
      employee: {} as Record<string, unknown>,
    };

    if (actor === 'admin') {
      payload.fullName = form.fullName;
      payload.email = form.email;
      payload.mobile = form.mobile;
      payload.gender = form.gender;
      payload.dob = form.dob || null;
      payload.verificationStatus = form.verificationStatus;
      payload.status = form.status;
      payload.meta = {
        ...(profile.meta ?? {}),
        assignedServiceZoneIds: form.assignedServiceZoneIds,
        assignedPincodes: form.assignedPincodes,
        cityManagerServiceZoneIds: form.cityManagerServiceZoneIds,
        isCityManagerPromoted: form.cityManagerServiceZoneIds.length > 0,
        assignedCity: serviceZones
          .filter((zone) => form.assignedServiceZoneIds.includes(zone.id))
          .map((zone) => zone.city)
          .filter(Boolean)
          .join(', ') || null,
      };
    }

    if (profile.role === 'doctor' && editable('languagesKnown')) {
      payload.meta = {
        ...((payload.meta as Record<string, unknown> | undefined) ?? profile.meta ?? {}),
        languagesKnown: form.languagesKnown,
      };
    }

    const employeePayload = payload.employee as Record<string, unknown>;
    for (const field of config.fields) {
      if (!editable(field.key)) continue;
      if (field.key === 'languagesKnown') continue;
      if (
        field.key === 'assignedServiceZoneIds'
        || field.key === 'assignedPincodes'
        || field.key === 'cityManagerServiceZoneIds'
      ) {
        continue;
      }
      const value = form[field.key as keyof typeof form];
      if (field.section === 'address' || field.section === 'employment' || field.section === 'role') {
        employeePayload[field.key] = value === '' ? null : value;
      }
    }

    if (editable('additionalNotes')) {
      employeePayload.additionalNotes = form.additionalNotes;
    }

    void onSave(payload);
  };

  const shouldShowField = (key: string, fieldSection: string) => {
    if (actor === 'self' && BASIC_IDENTITY_FIELD_KEYS.has(key)) return false;
    if (section === 'employment') return fieldSection === 'employment' || fieldSection === 'role';
    if (section === 'address') return fieldSection === 'address';
    return true;
  };

  const employmentFields = config.fields.filter(
    (f) => shouldShowField(f.key, f.section) && (f.section === 'employment' || f.section === 'role'),
  );
  const addressFields = config.fields.filter(
    (f) => shouldShowField(f.key, f.section) && f.section === 'address',
  );

  const renderField = (key: string, label: string) => {
    const isDisabled = !editable(key);
    return (
      <div key={key}>
        <Label>{label}</Label>
        <Input
          value={form[key as keyof typeof form] as string}
          disabled={isDisabled}
          readOnly={isDisabled && actor === 'self'}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
        {isDisabled && actor === 'self' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FiLock className="h-3 w-3" />
            Contact HR or admin to update.
          </p>
        )}
      </div>
    );
  };

  const renderLanguagesField = () => {
    const isDisabled = !editable('languagesKnown');
    return (
      <div key="languagesKnown" className="sm:col-span-2">
        <Label>Languages known</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Select all languages this doctor can consult in. Operations uses this when matching patients.
        </p>
        <div className="flex flex-wrap gap-2">
          {DOCTOR_LANGUAGES.map((language) => {
            const selected = form.languagesKnown.includes(language);
            return (
              <button
                key={language}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    languagesKnown: selected
                      ? prev.languagesKnown.filter((lang) => lang !== language)
                      : [...prev.languagesKnown, language],
                  }));
                }}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? 'border-livotale-pink bg-livotale-pink/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {language}
              </button>
            );
          })}
        </div>
        {isDisabled && actor === 'self' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FiLock className="h-3 w-3" />
            Contact HR or admin to update.
          </p>
        )}
      </div>
    );
  };

  const renderOperationsScopeField = () => (
    <OperationsScopeFields
      key="operations-scope"
      serviceZones={serviceZones}
      assignedServiceZoneIds={form.assignedServiceZoneIds}
      assignedPincodes={form.assignedPincodes}
      cityManagerServiceZoneIds={form.cityManagerServiceZoneIds}
      disabled={!editable('assignedServiceZoneIds')}
      onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
    />
  );

  const employmentContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employment & role details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {profile.role === 'operations' && actor === 'admin' && renderOperationsScopeField()}
          {employmentFields
            .filter((f) => !(
              profile.role === 'operations'
              && ['assignedServiceZoneIds', 'assignedPincodes', 'cityManagerServiceZoneIds'].includes(f.key)
            ))
            .map((f) =>
              f.key === 'languagesKnown' ? renderLanguagesField() : renderField(f.key, f.label),
            )}
          {editable('additionalNotes') && (
            <div className="sm:col-span-2">
              <Label>HR notes</Label>
              <Textarea
                value={form.additionalNotes}
                disabled={!editable('additionalNotes')}
                onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                rows={2}
              />
            </div>
          )}
          {viewMode === 'edit' && onSave && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSaving}>Save employment details</Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );

  const addressContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Home address & emergency contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {addressFields.map((f) => renderField(f.key, f.label))}
          {viewMode === 'edit' && onSave && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSaving}>Save address</Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );

  const legalContent = (
    <StaffLegalDocumentsPanel
      role={profile.role}
      documents={profile.documents}
      actor={actor}
      viewMode={viewMode}
      isSaving={isSaving}
      usingDemo={usingDemo}
      onUploadDocument={onUploadDocument}
      onVerifyDocument={onVerifyDocument}
    />
  );

  if (embedded && section) {
    return (
      <div className="space-y-4">
        {usingDemo && (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Demo profile data — run migration 030 and restart API for live employee records.
          </p>
        )}
        {section === 'employment' && employmentContent}
        {section === 'address' && addressContent}
        {section === 'legal' && legalContent}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {usingDemo && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Demo profile data — run migration 030 and restart API for live employee records.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {profile.employeeCode && (
            <Badge variant="outline" className="font-mono">{profile.employeeCode}</Badge>
          )}
          <Badge className="capitalize">{profile.verificationStatus}</Badge>
          <Badge variant="secondary" className="capitalize">{profile.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {actor === 'admin' && profile.verificationStatus !== 'verified' && onMarkVerified && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isSaving}
              onClick={() => void onMarkVerified()}
            >
              Mark verified (skip docs)
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'edit' ? 'default' : 'outline'}
            className="gap-1"
            onClick={() => setViewMode((m) => (m === 'view' ? 'edit' : 'view'))}
          >
            {viewMode === 'view' ? (
              <><FiEdit2 className="h-3.5 w-3.5" /> Edit profile</>
            ) : (
              <><FiEye className="h-3.5 w-3.5" /> View only</>
            )}
          </Button>
        </div>
      </div>

      {viewMode === 'view' && (
        <p className="text-xs text-muted-foreground">
          {actor === 'admin'
            ? 'View mode — click Edit profile to update HR fields and verify documents.'
            : 'View mode — switch to edit to update your address, emergency contact, and documents.'}
        </p>
      )}

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="legal">Legal docs</TabsTrigger>
        </TabsList>

        <TabsContent value="employment" className="mt-4">
          {employmentContent}
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          {addressContent}
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          {legalContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
