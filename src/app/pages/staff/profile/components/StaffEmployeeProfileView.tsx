import { useState, type FormEvent } from 'react';
import { FiEdit2, FiEye } from 'react-icons/fi';
import { StaffLegalDocumentsPanel } from '@/app/pages/staff/profile/components/StaffLegalDocumentsPanel';
import {
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
import type { StaffRoleKey } from '@/types/staffHub';
import type { StaffDocumentType, StaffFullProfile } from '@/types/staffProfile';

interface StaffEmployeeProfileViewProps {
  profile: StaffFullProfile;
  actor: 'self' | 'admin';
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
}

export function StaffEmployeeProfileView({
  profile,
  actor,
  isSaving = false,
  usingDemo = false,
  onSave,
  onUploadDocument,
  onVerifyDocument,
}: StaffEmployeeProfileViewProps) {
  const config = staffProfileConfig(profile.role);
  const emp = profile.employee;
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(actor === 'admin' ? 'edit' : 'view');

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
    bankAccountLast4: emp?.bankAccountLast4 ?? '',
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
  });

  const editable = (key: string) =>
    canEditStaffField(profile.role, key, actor, viewMode);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (viewMode !== 'edit' || !onSave) return;
    void onSave({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      gender: form.gender,
      dob: form.dob || null,
      verificationStatus: form.verificationStatus,
      status: form.status,
      employee: {
        joinedOn: form.joinedOn || null,
        qualification: form.qualification,
        certification: form.certification,
        registrationNumber: form.registrationNumber,
        specialization: form.specialization,
        clinicOrOrgName: form.clinicOrOrgName,
        bankAccountLast4: form.bankAccountLast4,
        additionalNotes: form.additionalNotes,
        homeLine1: form.homeLine1,
        homeLine2: form.homeLine2,
        homeCity: form.homeCity,
        homeState: form.homeState,
        homePincode: form.homePincode,
        emergencyContactName: form.emergencyContactName,
        emergencyContactMobile: form.emergencyContactMobile,
        emergencyContactRelation: form.emergencyContactRelation,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
      },
    });
  };

  const employmentFields = config.fields.filter((f) => f.section === 'employment');
  const addressFields = config.fields.filter((f) => f.section === 'address');
  const roleFields = config.fields.filter((f) => f.section === 'role');

  const renderField = (key: string, label: string) => (
    <div key={key}>
      <Label>{label}</Label>
      <Input
        value={form[key as keyof typeof form] as string}
        disabled={!editable(key)}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

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

      {viewMode === 'view' && (
        <p className="text-xs text-muted-foreground">
          {actor === 'admin'
            ? 'View mode — click Edit profile to update HR fields and verify documents.'
            : 'View mode — you can edit address, emergency contact, and upload documents. HR fields are admin-only.'}
        </p>
      )}

      <Tabs defaultValue="employment">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="legal">Legal docs</TabsTrigger>
        </TabsList>

        <TabsContent value="employment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment & role details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
                {employmentFields.map((f) => renderField(f.key, f.label))}
                {roleFields.map((f) => renderField(f.key, f.label))}
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
                    <Button type="submit" disabled={isSaving}>Save profile</Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="mt-4">
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
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
