import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastMessage[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, variant = 'success') => {
    const id = `toast-${++toastCounter}`;
    set({ toasts: [...get().toasts, { id, message, variant }] });
    window.setTimeout(() => {
      get().dismiss(id);
    }, 4000);
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));

export function toastSuccess(message: string) {
  useToastStore.getState().push(message, 'success');
}

export function toastError(message: string) {
  useToastStore.getState().push(message, 'error');
}
