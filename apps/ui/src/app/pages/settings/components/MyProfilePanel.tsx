import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankDetailsPanel } from '@/app/pages/bank/components/BankDetailsPanel';
import { ProfileBasicInfoSection } from '@/app/pages/settings/components/ProfileBasicInfoSection';
import { StaffSelfProfileContent } from '@/app/pages/staff/profile/components/StaffSelfProfileContent';
import { useAuthStore, useProfileStore, useUserRole } from '@/store';
import { AppRole } from '@/types';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const STAFF_ROLES = new Set<AppRole>([
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.LAB_PARTNER,
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.PHARMACY,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
]);

const STAFF_PROFILE_SECTIONS = ['basic', 'employment', 'address', 'legal', 'bank'] as const;
const TECH_PROFILE_SECTIONS = ['basic', 'employment', 'address', 'coverage', 'legal', 'bank'] as const;

export function MyProfilePanel() {
  const user = useAuthStore((state) => state.user);
  const userRole = useUserRole();
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const error = useProfileStore((state) => state.error);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const saveBasic = useProfileStore((state) => state.saveBasic);
  const uploadPhoto = useProfileStore((state) => state.uploadPhoto);

  const isStaff = userRole != null && STAFF_ROLES.has(userRole);
  const isTechnician = userRole === AppRole.TECHNICIAN;
  const profileSections = useMemo(
    () => (isTechnician ? TECH_PROFILE_SECTIONS : STAFF_PROFILE_SECTIONS),
    [isTechnician],
  );
  const [profileSection, setProfileSection] = useUrlTabState({
    param: 'profileSection',
    defaultValue: 'basic',
    validValues: profileSections,
    omitDefault: true,
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.basic.full_name ?? '');
    setEmail(profile.basic.email ?? '');
    setMobile(profile.basic.mobile ?? '');
    setGender(profile.basic.gender ?? '');
    setDob(profile.basic.dob?.slice(0, 10) ?? '');
  }, [profile]);

  const basicSection = (
    <ProfileBasicInfoSection
      basic={profile?.basic ?? null}
      fullName={fullName}
      email={email}
      mobile={mobile}
      gender={gender}
      dob={dob}
      isLoading={isLoading}
      displayNameFallback={user?.fullName}
      onFullNameChange={setFullName}
      onMobileChange={setMobile}
      onGenderChange={setGender}
      onDobChange={setDob}
      onSave={async (payload) => {
        await saveBasic({
          fullName: payload.fullName,
          mobile: payload.mobile || undefined,
          gender: payload.gender || undefined,
          dob: payload.dob || undefined,
        });
      }}
      onPhotoUpload={user?.id ? (file) => uploadPhoto(file, user.id) : undefined}
    />
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {isStaff ? (
        <Tabs value={profileSection} onValueChange={setProfileSection} className="w-full">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="basic">Basic info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            {isTechnician && <TabsTrigger value="coverage">Coverage</TabsTrigger>}
            <TabsTrigger value="legal">Legal docs</TabsTrigger>
            <TabsTrigger value="bank">Bank / Payout</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            {basicSection}
          </TabsContent>

          <TabsContent value="employment" className="mt-4">
            {profileSection === 'employment' && <StaffSelfProfileContent section="employment" />}
          </TabsContent>

          <TabsContent value="address" className="mt-4">
            {profileSection === 'address' && <StaffSelfProfileContent section="address" />}
          </TabsContent>

          {isTechnician && (
            <TabsContent value="coverage" className="mt-4">
              {profileSection === 'coverage' && <StaffSelfProfileContent section="coverage" />}
            </TabsContent>
          )}

          <TabsContent value="legal" className="mt-4">
            {profileSection === 'legal' && <StaffSelfProfileContent section="legal" />}
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            {profileSection === 'bank' && <BankDetailsPanel mode="self" />}
          </TabsContent>
        </Tabs>
      ) : (
        basicSection
      )}
    </div>
  );
}
