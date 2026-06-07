import { useState, type FormEvent } from 'react';
import { FiEdit2, FiEye } from 'react-icons/fi';
import { StaffLegalDocumentsPanel } from '@/app/pages/staff/profile/components/StaffLegalDocumentsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { StaffComplianceDocument, StaffDocumentType } from '@/types/staffProfile';
import {
  type TechnicianDocumentType,
  type TechnicianFullProfile,
} from '@/types/technicianProfile';

interface TechnicianProfileViewProps {
  profile: TechnicianFullProfile;
  mode: 'technician' | 'admin';
  isSaving?: boolean;
  usingDemo?: boolean;
  onSaveEmployee?: (payload: Record<string, unknown>) => void | Promise<void>;
  onSaveAdmin?: (payload: Record<string, unknown>) => void | Promise<void>;
  onSavePincodes?: (pincodes: string[]) => void | Promise<void>;
  onUploadDocument?: (
    file: File,
    meta: {
      documentType: TechnicianDocumentType;
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

export function TechnicianProfileView({
  profile,
  mode,
  isSaving = false,
  usingDemo = false,
  onSaveEmployee,
  onSaveAdmin,
  onSavePincodes,
  onUploadDocument,
  onVerifyDocument,
}: TechnicianProfileViewProps) {
  const emp = profile.employee;
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(mode === 'admin' ? 'edit' : 'view');
  const [pincodeInput, setPincodeInput] = useState(
    profile.servicePincodes.filter((p) => p.isActive).map((p) => p.pincode).join(', '),
  );

  const [form, setForm] = useState({
    fullName: profile.fullName,
    email: profile.email ?? '',
    mobile: profile.mobile ?? '',
    gender: profile.gender ?? '',
    dob: profile.dob?.slice(0, 10) ?? '',
    technicianType: profile.technicianType ?? '',
    serviceZone: profile.serviceZone ?? '',
    maxAppointmentsPerDay: String(profile.maxAppointmentsPerDay ?? ''),
    verificationStatus: profile.verificationStatus,
    status: profile.status,
    homeLine1: emp?.homeLine1 ?? '',
    homeLine2: emp?.homeLine2 ?? '',
    homeCity: emp?.homeCity ?? '',
    homeState: emp?.homeState ?? '',
    homePincode: emp?.homePincode ?? '',
    emergencyContactName: emp?.emergencyContactName ?? '',
    emergencyContactMobile: emp?.emergencyContactMobile ?? '',
    emergencyContactRelation: emp?.emergencyContactRelation ?? '',
    qualification: emp?.qualification ?? '',
    certification: emp?.certification ?? '',
    vehicleType: emp?.vehicleType ?? '',
    vehicleNumber: emp?.vehicleNumber ?? '',
    joinedOn: emp?.joinedOn?.slice(0, 10) ?? '',
    bankAccountLast4: emp?.bankAccountLast4 ?? '',
    additionalNotes: emp?.additionalNotes ?? '',
  });

  const submitEmployee = (e: FormEvent) => {
    e.preventDefault();
    void onSaveEmployee?.({
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
    });
  };

  const submitAdmin = (e: FormEvent) => {
    e.preventDefault();
    void onSaveAdmin?.({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      gender: form.gender,
      dob: form.dob || null,
      technicianType: form.technicianType,
      serviceZone: form.serviceZone,
      maxAppointmentsPerDay: Number(form.maxAppointmentsPerDay) || null,
      verificationStatus: form.verificationStatus,
      status: form.status,
      employee: {
        homeLine1: form.homeLine1,
        homeLine2: form.homeLine2,
        homeCity: form.homeCity,
        homeState: form.homeState,
        homePincode: form.homePincode,
        emergencyContactName: form.emergencyContactName,
        emergencyContactMobile: form.emergencyContactMobile,
        emergencyContactRelation: form.emergencyContactRelation,
        qualification: form.qualification,
        certification: form.certification,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        joinedOn: form.joinedOn || null,
        bankAccountLast4: form.bankAccountLast4,
        additionalNotes: form.additionalNotes,
      },
    });
  };

  const submitPincodes = () => {
    const pincodes = pincodeInput.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
    void onSavePincodes?.(pincodes);
  };

  const fieldDisabled = (adminOnly: boolean) =>
    viewMode === 'view' || (mode === 'technician' && adminOnly);

  const mappedDocs: StaffComplianceDocument[] = profile.documents.map((d) => ({
    ...d,
    documentType: d.documentType as StaffDocumentType,
  }));

  return (
    <div className="space-y-4">
      {usingDemo && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Demo profile data — run migration 029 and restart API for live employee records.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono">{profile.employeeCode}</Badge>
          <Badge className="capitalize">{profile.verificationStatus}</Badge>
          <Badge variant="secondary" className="capitalize">{profile.status}</Badge>
          {profile.technicianType && <Badge variant="outline">{profile.technicianType.replace(/_/g, ' ')}</Badge>}
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

      <Tabs defaultValue="employment" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="legal">Legal docs</TabsTrigger>
        </TabsList>

        <TabsContent value="employment" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Employment details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={mode === 'admin' && viewMode === 'edit' ? submitAdmin : (e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-2">
                <div><Label>Full name</Label><Input value={form.fullName} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
                <div><Label>Employee code</Label><Input value={profile.employeeCode} disabled /></div>
                <div><Label>Email</Label><Input value={form.email} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Mobile</Label><Input value={form.mobile} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
                <div><Label>Gender</Label><Input value={form.gender} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, gender: e.target.value })} /></div>
                <div><Label>Date of birth</Label><Input type="date" value={form.dob} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div><Label>Technician type</Label><Input value={form.technicianType} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, technicianType: e.target.value })} /></div>
                <div><Label>Service zone</Label><Input value={form.serviceZone} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, serviceZone: e.target.value })} /></div>
                <div><Label>Max appointments / day</Label><Input type="number" value={form.maxAppointmentsPerDay} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, maxAppointmentsPerDay: e.target.value })} /></div>
                <div><Label>Joined on</Label><Input type="date" value={form.joinedOn} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, joinedOn: e.target.value })} /></div>
                <div><Label>Qualification</Label><Input value={form.qualification} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
                <div><Label>Certification</Label><Input value={form.certification} disabled={fieldDisabled(true)} onChange={(e) => setForm({ ...form, certification: e.target.value })} /></div>
                <div><Label>Vehicle type</Label><Input value={form.vehicleType} disabled={fieldDisabled(false)} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} /></div>
                <div><Label>Vehicle number</Label><Input value={form.vehicleNumber} disabled={fieldDisabled(false)} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} /></div>
                {mode === 'admin' && viewMode === 'edit' && (
                  <>
                    <div><Label>Verification status</Label><Input value={form.verificationStatus} onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })} /></div>
                    <div><Label>Availability status</Label><Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} /></div>
                    <div><Label>Bank account (last 4)</Label><Input maxLength={4} value={form.bankAccountLast4} onChange={(e) => setForm({ ...form, bankAccountLast4: e.target.value })} /></div>
                    <div className="sm:col-span-2"><Label>HR notes</Label><Textarea value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} rows={2} /></div>
                    <div className="sm:col-span-2"><Button type="submit" disabled={isSaving}>Save employment profile</Button></div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Home address & emergency contact</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={viewMode === 'edit' ? submitEmployee : (e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={form.homeLine1} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, homeLine1: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address line 2</Label><Input value={form.homeLine2} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, homeLine2: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.homeCity} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, homeCity: e.target.value })} /></div>
                <div><Label>State</Label><Input value={form.homeState} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, homeState: e.target.value })} /></div>
                <div><Label>Pincode</Label><Input value={form.homePincode} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, homePincode: e.target.value })} /></div>
                <div><Label>Emergency contact name</Label><Input value={form.emergencyContactName} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
                <div><Label>Emergency mobile</Label><Input value={form.emergencyContactMobile} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, emergencyContactMobile: e.target.value })} /></div>
                <div><Label>Relation</Label><Input value={form.emergencyContactRelation} disabled={viewMode === 'view'} onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })} /></div>
                {viewMode === 'edit' && (
                  <div className="sm:col-span-2"><Button type="submit" disabled={isSaving}>Save address & emergency</Button></div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Service area (pincodes)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pincodes where this technician can be auto-assigned or request route orders.
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.servicePincodes.filter((p) => p.isActive).map((p) => (
                  <Badge key={p.pincode} variant="secondary">{p.pincode}</Badge>
                ))}
                {profile.servicePincodes.filter((p) => p.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground">No pincodes configured.</p>
                )}
              </div>
              {mode === 'admin' && viewMode === 'edit' && (
                <>
                  <div>
                    <Label>Pincodes (comma-separated)</Label>
                    <Input value={pincodeInput} onChange={(e) => setPincodeInput(e.target.value)} placeholder="400050, 400013, 400028" />
                  </div>
                  <Button type="button" disabled={isSaving} onClick={submitPincodes}>Update coverage</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          <StaffLegalDocumentsPanel
            role="technician"
            documents={mappedDocs}
            actor={mode === 'admin' ? 'admin' : 'self'}
            viewMode={viewMode}
            isSaving={isSaving}
            usingDemo={usingDemo}
            onUploadDocument={
              onUploadDocument
                ? (file, meta) =>
                    onUploadDocument(file, {
                      ...meta,
                      documentType: meta.documentType as TechnicianDocumentType,
                    })
                : undefined
            }
            onVerifyDocument={mode === 'admin' ? onVerifyDocument : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
