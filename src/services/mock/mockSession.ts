import type { User } from '@/types';

let currentUser: User | null = null;

export function setMockSessionUser(user: User | null): void {
  currentUser = user;
}

export function getMockSessionUser(): User | null {
  return currentUser;
}
