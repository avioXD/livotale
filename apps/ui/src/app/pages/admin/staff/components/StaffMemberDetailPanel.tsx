import { useCallback, useEffect, useState } from 'react';
import { StaffEmployeeProfileView } from '@/app/pages/staff/profile/components/StaffEmployeeProfileView';
import { TechnicianProfileView } from '@/app/pages/technician/profile/components/TechnicianProfileView';
import { staffProfileService } from '@/services/staff/StaffProfileService';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import { technicianProfileService } from '@/services/technician/TechnicianProfileService';
import type { StaffLabPartnerProfile } from '@/types/sampleCollection';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import type { StaffFullProfile } from '@/types/staffProfile';
import type { TechnicianFullProfile } from '@/types/technicianProfile';

interface StaffMemberDetailPanelProps {
  roleKey: StaffRoleKey;
  member: StaffMemberRow;
  labPartner?: StaffLabPartnerProfile;
  doctor?: {
    id: string;
    fullName: string;
    specialization: string | null;
    qualification: string | null;
    registrationNumber: string | null;
    clinicName: string | null;
  };
  onSaved: () => void;
}

export function StaffMemberDetailPanel({
  roleKey,
  member,
  onSaved,
}: StaffMemberDetailPanelProps) {
  const [techProfile, setTechProfile] = useState<TechnicianFullProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffFullProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (roleKey === 'technician') {
        const profile = await technicianProfileService.getAdminProfile(member.id);
        setTechProfile(profile);
      } else {
        const profile = await staffProfileService.getAdminProfile(roleKey, member.id, member);
        setStaffProfile(profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [roleKey, member]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4">Loading employee profile…</p>;
  }

  if (roleKey === 'technician') {
    if (!techProfile) {
      return <p className="text-sm text-muted-foreground p-4">Profile unavailable.</p>;
    }
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-destructive px-1">{error}</p>}
        <TechnicianProfileView
          profile={techProfile}
          mode="admin"
          isSaving={isSaving}
          usingDemo={usingDemo}
          onSaveEmployee={async (payload) => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.updateAdminProfile(member.id, { employee: payload }));
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onSaveAdmin={async (payload) => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.updateAdminProfile(member.id, payload));
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onSavePincodes={async (pincodes) => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.setAdminPincodes(member.id, pincodes));
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Pincode update failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadDocument={async (file, meta) => {
            setIsSaving(true);
            try {
              await technicianProfileService.uploadAdminDocument(member.id, file, meta);
              await load();
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onVerifyDocument={async (documentId, status, notes) => {
            setIsSaving(true);
            try {
              await technicianProfileService.verifyDocument(documentId, status, notes);
              await load();
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Verification failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onMarkVerified={async () => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.markProfileVerified(member.id));
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Verification failed');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      </div>
    );
  }

  if (!staffProfile) {
    return <p className="text-sm text-muted-foreground p-4">Profile unavailable.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive px-1">{error}</p>}
      <StaffEmployeeProfileView
        profile={staffProfile}
        actor="admin"
        isSaving={isSaving}
        usingDemo={usingDemo}
        onSave={async (payload) => {
          setIsSaving(true);
          try {
            const updated = await staffProfileService.updateAdminProfile(roleKey, member.id, payload, member);
            setStaffProfile(updated);
            await staffDirectoryService.updateMember(roleKey, member.id, {
              fullName: String(payload.fullName ?? updated.fullName),
              email: (payload.email as string | undefined) ?? updated.email,
              mobile: (payload.mobile as string | undefined) ?? updated.mobile,
              status: (payload.status as string | undefined) ?? updated.status,
            });
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
          } finally {
            setIsSaving(false);
          }
        }}
        onUploadDocument={async (file, meta) => {
          setIsSaving(true);
          try {
            await staffProfileService.uploadAdminDocument(roleKey, member.id, file, meta, member);
            await load();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
          } finally {
            setIsSaving(false);
          }
        }}
        onVerifyDocument={async (documentId, status, notes) => {
          setIsSaving(true);
          try {
            await staffProfileService.verifyDocument(documentId, status, notes);
            await load();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
          } finally {
            setIsSaving(false);
          }
        }}
        onMarkVerified={async () => {
          setIsSaving(true);
          try {
            setStaffProfile(await staffProfileService.markProfileVerified(roleKey, member.id));
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
          } finally {
            setIsSaving(false);
          }
        }}
      />
    </div>
  );
}
