import type { StaffOnboardingInvite, StaffOnboardingStatus } from '@/types/staffOnboarding';
import type { StaffRoleKey } from '@/types/staffHub';

const STORAGE_KEY = 'livotale_staff_onboarding_invites';

function load(): StaffOnboardingInvite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaffOnboardingInvite[]) : [];
  } catch {
    return [];
  }
}

function save(invites: StaffOnboardingInvite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
}

function makeToken() {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function demoCreateInvite(
  roleKey: StaffRoleKey,
  payload: { fullName: string; mobile: string; email?: string; username?: string },
): StaffOnboardingInvite {
  const invites = load();
  const invite: StaffOnboardingInvite = {
    id: `invite-${Date.now()}`,
    token: makeToken(),
    roleKey,
    fullName: payload.fullName,
    email: payload.email ?? null,
    mobile: payload.mobile,
    username: payload.username ?? null,
    memberId: `demo-${roleKey}-${Date.now()}`,
    userId: null,
    status: 'invited',
    profileComplete: false,
    verificationStatus: 'pending',
    employmentStatus: 'inactive',
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    linkSentAt: null,
    registeredAt: null,
    profileSubmittedAt: null,
    activatedAt: null,
    createdAt: new Date().toISOString(),
  };
  invites.unshift(invite);
  save(invites);
  return invite;
}

export function demoGetInvite(token: string): StaffOnboardingInvite | null {
  return load().find((i) => i.token === token) ?? null;
}

export function demoListInvites(roleKey: StaffRoleKey): StaffOnboardingInvite[] {
  return load().filter((i) => i.roleKey === roleKey);
}

export function demoUpdateInvite(token: string, patch: Partial<StaffOnboardingInvite>): StaffOnboardingInvite | null {
  const invites = load();
  const idx = invites.findIndex((i) => i.token === token);
  if (idx < 0) return null;
  invites[idx] = { ...invites[idx], ...patch };
  save(invites);
  return invites[idx];
}

export function demoAttachUser(token: string, userId: string): StaffOnboardingInvite | null {
  return demoUpdateInvite(token, {
    userId,
    registeredAt: new Date().toISOString(),
    status: 'registered',
  });
}

export function demoSubmitProfile(
  token: string,
  patch: { profileComplete: boolean; verificationStatus: string },
): StaffOnboardingInvite | null {
  const active = patch.profileComplete && patch.verificationStatus === 'verified';
  return demoUpdateInvite(token, {
    profileComplete: patch.profileComplete,
    verificationStatus: patch.verificationStatus,
    employmentStatus: active ? 'active' : 'inactive',
    profileSubmittedAt: patch.profileComplete ? new Date().toISOString() : null,
    activatedAt: active ? new Date().toISOString() : null,
    status: active ? 'active' : patch.profileComplete ? 'pending_verification' : 'registered',
  });
}

export function demoGetStatusForUser(userId: string): StaffOnboardingStatus {
  const invite = load().find((i) => i.userId === userId);
  if (!invite) {
    return {
      required: false,
      profileComplete: true,
      verificationComplete: true,
      employmentStatus: 'active',
      canAccessApp: true,
    };
  }
  const active = invite.profileComplete && invite.verificationStatus === 'verified';
  return {
    required: true,
    inviteId: invite.id,
    inviteToken: invite.token,
    roleKey: invite.roleKey,
    profileComplete: invite.profileComplete,
    verificationComplete: invite.verificationStatus === 'verified',
    employmentStatus: invite.employmentStatus,
    verificationStatus: invite.verificationStatus,
    status: invite.status,
    canAccessApp: active,
  };
}

export function demoMarkLinkSent(token: string): StaffOnboardingInvite | null {
  return demoUpdateInvite(token, {
    linkSentAt: new Date().toISOString(),
    status: 'link_sent',
  });
}
