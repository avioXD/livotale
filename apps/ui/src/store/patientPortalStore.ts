import { create } from 'zustand';
import type { PatientPortalSession } from '@/types/patientPortal';

const STORAGE_KEY = 'livotale_patient_portal_session';

function loadSession(): PatientPortalSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PatientPortalSession;
  } catch {
    return null;
  }
}

function saveSession(session: PatientPortalSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface PatientPortalState {
  session: PatientPortalSession | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (session: PatientPortalSession) => void;
  logout: () => void;
}

export const usePatientPortalStore = create<PatientPortalState>((set) => ({
  session: null,
  hydrated: false,
  hydrate: () => {
    set({ session: loadSession(), hydrated: true });
  },
  setSession: (session) => {
    saveSession(session);
    set({ session });
  },
  logout: () => {
    saveSession(null);
    set({ session: null });
  },
}));
