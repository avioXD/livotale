import { useCallback, useEffect, useMemo, useState } from 'react';
import { StaffEmployeeProfileView } from '@/app/pages/staff/profile/components/StaffEmployeeProfileView';
import { staffProfileConfig } from '@/app/pages/staff/profile/staffProfileConfig';
import { TechnicianProfileView } from '@/app/pages/technician/profile/components/TechnicianProfileView';
import { staffProfileService } from '@/services/staff/StaffProfileService';
import { technicianProfileService } from '@/services/technician/TechnicianProfileService';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';
import type { StaffRoleKey } from '@/types/staffHub';
import type { StaffFullProfile } from '@/types/staffProfile';
import type { TechnicianFullProfile } from '@/types/technicianProfile';

const ROLE_MAP: Partial<Record<AppRole, StaffRoleKey>> = {
  [AppRole.TECHNICIAN]: 'technician',
  [AppRole.DOCTOR]: 'doctor',
  [AppRole.LAB_PARTNER]: 'lab_partner',
  [AppRole.DIETICIAN]: 'dietician',
  [AppRole.HEALTH_COACH]: 'health_coach',
  [AppRole.PHARMACY]: 'pharmacy',
  [AppRole.OPERATIONS]: 'operations',
  [AppRole.CITY_MANAGER]: 'operations',
  [AppRole.SUPER_ADMIN]: 'operations',
};

export function StaffSelfProfileContent() {
  const userRole = useUserRole();
  const staffRole = userRole ? ROLE_MAP[userRole] : undefined;
  const config = staffRole ? staffProfileConfig(staffRole) : null;

  const [techProfile, setTechProfile] = useState<TechnicianFullProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffFullProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usingDemo = useMemo(() => {
    if (staffRole === 'technician') return techProfile?.id.startsWith('demo-') ?? false;
    return staffProfile?.documents.some((d) => d.id.startsWith('demo-')) ?? false;
  }, [staffRole, techProfile, staffProfile]);

  const load = useCallback(async () => {
    if (!staffRole) return;
    setIsLoading(true);
    setError(null);
    try {
      if (staffRole === 'technician') {
        setTechProfile(await technicianProfileService.getMyProfile());
      } else {
        setStaffProfile(await staffProfileService.getMyProfile(staffRole));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [staffRole]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!staffRole || !config) {
    return (
      <p className="text-sm text-muted-foreground">
        Employee profile is not available for your role.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {config.label} employment record, address, and required legal documents for onboarding.
      </p>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : staffRole === 'technician' && techProfile ? (
        <TechnicianProfileView
          profile={techProfile}
          mode="technician"
          isSaving={isSaving}
          usingDemo={usingDemo}
          onSaveEmployee={async (payload) => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.updateMyProfile(payload));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadDocument={async (file, meta) => {
            setIsSaving(true);
            try {
              await technicianProfileService.uploadMyDocument(file, meta);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : staffProfile ? (
        <StaffEmployeeProfileView
          profile={staffProfile}
          actor="self"
          isSaving={isSaving}
          usingDemo={usingDemo}
          onSave={async (payload) => {
            setIsSaving(true);
            try {
              setStaffProfile(await staffProfileService.updateMyProfile(staffRole, payload));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadDocument={async (file, meta) => {
            setIsSaving(true);
            try {
              await staffProfileService.uploadMyDocument(staffRole, file, meta);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
