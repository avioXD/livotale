import { useRef, type FormEvent } from 'react';
import { FiCamera, FiLock } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProfileBasic } from '@/types';

/** Fields the signed-in user may update on their own account. */
export const SELF_EDITABLE_BASIC_FIELDS = new Set(['fullName', 'mobile', 'gender', 'dob']);

interface ProfileBasicInfoSectionProps {
  basic: ProfileBasic | null;
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  dob: string;
  isLoading?: boolean;
  onFullNameChange: (value: string) => void;
  onMobileChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onDobChange: (value: string) => void;
  onSave: (payload: { fullName: string; mobile: string; gender: string; dob: string }) => Promise<void>;
  onPhotoUpload?: (file: File) => Promise<void>;
  displayNameFallback?: string;
}

function LockedFieldHint() {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <FiLock className="h-3 w-3" />
      Managed by your organisation — contact HR or admin to change.
    </p>
  );
}

export function ProfileBasicInfoSection({
  basic,
  fullName,
  email,
  mobile,
  gender,
  dob,
  isLoading = false,
  onFullNameChange,
  onMobileChange,
  onGenderChange,
  onDobChange,
  onSave,
  onPhotoUpload,
  displayNameFallback = '?',
}: ProfileBasicInfoSectionProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave({ fullName, mobile, gender, dob });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoUpload) return;
    await onPhotoUpload(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
          {basic?.profile_photo_url ? (
            <img src={basic.profile_photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
              {(fullName || displayNameFallback).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {onPhotoUpload && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Profile photo</p>
            <p className="text-xs text-muted-foreground">JPG or PNG, max 5 MB.</p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handlePhotoChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={isLoading}
              onClick={() => photoInputRef.current?.click()}
            >
              <FiCamera className="h-4 w-4" />
              {isLoading ? 'Uploading…' : 'Upload photo'}
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="profile-fullName">Full name</Label>
          <Input
            id="profile-fullName"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Work email</Label>
          <Input id="profile-email" type="email" value={email} disabled readOnly />
          <LockedFieldHint />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-mobile">Mobile</Label>
          <Input
            id="profile-mobile"
            type="tel"
            value={mobile}
            onChange={(e) => onMobileChange(e.target.value)}
            placeholder="+91XXXXXXXXXX"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-gender">Gender</Label>
            <Select value={gender || 'undisclosed'} onValueChange={onGenderChange}>
              <SelectTrigger id="profile-gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undisclosed">Prefer not to say</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-dob">Date of birth</Label>
            <Input
              id="profile-dob"
              type="date"
              value={dob}
              onChange={(e) => onDobChange(e.target.value)}
            />
          </div>
        </div>

        {basic?.username && (
          <div className="space-y-2">
            <Label htmlFor="profile-username">Username</Label>
            <Input id="profile-username" value={basic.username} disabled readOnly />
            <LockedFieldHint />
          </div>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save basic info'}
        </Button>
      </form>
    </div>
  );
}
