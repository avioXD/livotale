import type { StaffRoleKey } from '@/types/staffHub';

export type StaffOnboardingInviteStatus =
  | 'invited'
  | 'link_sent'
  | 'registered'
  | 'pending_verification'
  | 'active';

export interface StaffOnboardingInvite {
  id: string;
  token: string;
  roleKey: StaffRoleKey;
  fullName: string;
  email: string | null;
  mobile: string;
  username: string | null;
  memberId: string | null;
  userId: string | null;
  status: StaffOnboardingInviteStatus;
  profileComplete: boolean;
  verificationStatus: string;
  employmentStatus: string;
  expiresAt: string;
  linkSentAt: string | null;
  registeredAt: string | null;
  profileSubmittedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
}

export interface StaffOnboardingStatus {
  required: boolean;
  inviteId?: string;
  inviteToken?: string;
  roleKey?: StaffRoleKey;
  profileComplete: boolean;
  verificationComplete: boolean;
  employmentStatus: string;
  verificationStatus?: string;
  status?: StaffOnboardingInviteStatus;
  canAccessApp: boolean;
}

export interface CreateStaffInvitePayload {
  fullName: string;
  mobile: string;
  email?: string;
  username?: string;
  profile?: Record<string, unknown>;
}
