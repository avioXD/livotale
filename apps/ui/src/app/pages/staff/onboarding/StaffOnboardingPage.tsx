import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StaffEmployeeProfileView } from '@/app/pages/staff/profile/components/StaffEmployeeProfileView';
import { STAFF_ROLE_CONFIGS } from '@/app/pages/admin/staff/staffHubConfig';
import {
  hasAllRequiredDocumentsUploaded,
  isStaffProfileComplete,
  isStaffVerificationComplete,
} from '@/app/pages/staff/onboarding/staffOnboardingUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TechnicianProfileView } from '@/app/pages/technician/profile/components/TechnicianProfileView';
import { orgPath } from '@/app/config/orgRoutes';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import { staffProfileService } from '@/services/staff/StaffProfileService';
import { technicianProfileService } from '@/services/technician/TechnicianProfileService';
import { useAuthStore, useStaffOnboardingStore } from '@/store';
import type { StaffRoleKey } from '@/types/staffHub';
import type { StaffFullProfile } from '@/types/staffProfile';
import type { TechnicianFullProfile } from '@/types/technicianProfile';

export function StaffOnboardingPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loadOnboardingStatus = useStaffOnboardingStore((s) => s.loadStatus);

  const [roleKey, setRoleKey] = useState<StaffRoleKey>('technician');
  const [staffProfile, setStaffProfile] = useState<StaffFullProfile | null>(null);
  const [techProfile, setTechProfile] = useState<TechnicianFullProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (inviteToken) {
        const invite = await staffOnboardingService.getInvite(inviteToken);
        setRoleKey(invite.roleKey);
      } else {
        const status = await staffOnboardingService.getStatus();
        if (status.roleKey) setRoleKey(status.roleKey);
      }

      const role = inviteToken
        ? (await staffOnboardingService.getInvite(inviteToken)).roleKey
        : roleKey;

      if (role === 'technician') {
        setTechProfile(await technicianProfileService.getMyProfile());
      } else {
        setStaffProfile(await staffProfileService.getMyProfile(role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [inviteToken, roleKey, user?.fullName]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitOnboarding = async () => {
    let token = inviteToken;
    if (!token) {
      const status = await staffOnboardingService.getStatus(user?.id);
      token = status.inviteToken ?? null;
    }
    if (!token) {
      setError('No onboarding invite found. Contact your administrator.');
      return;
    }
    const profile = roleKey === 'technician' ? null : staffProfile;
    const tech = roleKey === 'technician' ? techProfile : null;
    const docs = tech?.documents ?? profile?.documents ?? [];

    const profileComplete = tech
      ? Boolean(tech.employee?.homeLine1 && tech.employee?.homePincode)
      : profile
        ? isStaffProfileComplete(roleKey, profile)
        : false;
    const docsUploaded = hasAllRequiredDocumentsUploaded(
      roleKey,
      docs.map((d) => ({ ...d, documentType: d.documentType as StaffFullProfile['documents'][0]['documentType'] })),
    );
    const verificationComplete = isStaffVerificationComplete(
      roleKey,
      docs.map((d) => ({ ...d, documentType: d.documentType as StaffFullProfile['documents'][0]['documentType'] })),
    );

    if (!profileComplete || !docsUploaded) {
      setError('Complete address details and upload all required documents before submitting.');
      return;
    }

    setIsSaving(true);
    try {
      await staffOnboardingService.submitProfile(token, {
        profileComplete: true,
        verificationStatus: verificationComplete ? 'verified' : 'pending',
      });
      await loadOnboardingStatus(user?.id);
      setSubmitted(true);
      if (verificationComplete) {
        navigate(orgPath('/dashboard'), { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setIsSaving(false);
    }
  };

  const roleConfig = STAFF_ROLE_CONFIGS.find((r) => r.key === roleKey)!;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <PageHeader
        title="Complete your onboarding"
        description={`${roleConfig.label} profile, legal documents, and verification. You remain inactive until HR approves.`}
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm">
          <Badge variant="outline" className="capitalize">inactive</Badge>
          <span className="text-muted-foreground">
            Submit profile → pending verification → active after admin approves documents
          </span>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {submitted && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-900 dark:text-green-100">
          Profile submitted. HR will verify your documents — you will be activated once approved.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading onboarding form…</p>
      ) : roleKey === 'technician' && techProfile ? (
        <TechnicianProfileView
          profile={techProfile}
          mode="technician"
          isSaving={isSaving}
          usingDemo={false}
          onSaveEmployee={async (payload) => {
            setIsSaving(true);
            try {
              setTechProfile(await technicianProfileService.updateMyProfile(payload));
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadDocument={async (file, meta) => {
            setIsSaving(true);
            try {
              await technicianProfileService.uploadMyDocument(file, meta);
              await load();
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
          onSave={async (payload) => {
            setIsSaving(true);
            try {
              setStaffProfile(await staffProfileService.updateMyProfile(roleKey, payload));
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadDocument={async (file, meta) => {
            setIsSaving(true);
            try {
              await staffProfileService.uploadMyDocument(roleKey, file, meta);
              await load();
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : null}

      {!submitted && (
        <Button size="lg" disabled={isSaving || isLoading} onClick={() => void submitOnboarding()}>
          Submit for verification
        </Button>
      )}
    </div>
  );
}
