import { create } from 'zustand';
import { packageService } from '@/services/liverCare';
import { emptyPackageDraft, normalizePackageDraft, type CreatePackageDraft } from '@/services/liverCare/package.utils';
import { usePackagesAdminStore } from './packagesAdminStore';
import { usePublicPackagesStore } from './publicPackagesStore';
import type { LiverCarePackage } from '@/types/package';

function toDraft(pkg: LiverCarePackage): CreatePackageDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = pkg;
  return normalizePackageDraft(rest);
}

interface PackageDetailStore {
  pkg: LiverCarePackage | null;
  draft: CreatePackageDraft | null;
  isCreate: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  initCreate: () => Promise<void>;
  loadById: (id: string) => Promise<void>;
  patchDraft: (patch: Partial<CreatePackageDraft>) => void;
  save: () => Promise<LiverCarePackage>;
  remove: () => Promise<void>;
  clear: () => void;
  clearError: () => void;
}

export const usePackageDetailStore = create<PackageDetailStore>((set, get) => ({
  pkg: null,
  draft: null,
  isCreate: false,
  isLoading: false,
  isSaving: false,
  error: null,

  initCreate: async () => {
    set({ isLoading: true, error: null, isCreate: true, pkg: null, draft: null });
    try {
      const rows = await packageService.listAdmin();
      set({ draft: emptyPackageDraft(rows), isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to prepare new package',
      });
    }
  },

  loadById: async (id) => {
    set({ isLoading: true, error: null, isCreate: false, pkg: null, draft: null });
    try {
      const rows = await packageService.listAdmin();
      const found = rows.find((p) => p.id === id) ?? (await packageService.getById(id));
      if (!found) {
        set({ isLoading: false });
        return;
      }
      set({ pkg: found, draft: toDraft(found), isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load package',
      });
    }
  },

  patchDraft: (patch) => {
    const { draft } = get();
    if (!draft) return;
    set({ draft: { ...draft, ...patch } });
  },

  save: async () => {
    const { draft, pkg, isCreate } = get();
    if (!draft) throw new Error('No draft to save');
    if (!draft.name.trim()) {
      set({ error: 'Package name is required.' });
      throw new Error('Package name is required.');
    }

    set({ isSaving: true, error: null });
    try {
      const payload = normalizePackageDraft(draft);
      const saved = isCreate
        ? await packageService.create(payload)
        : await packageService.update(pkg!.id, payload);

      set({
        pkg: saved,
        draft: toDraft(saved),
        isCreate: false,
        isSaving: false,
      });

      usePackagesAdminStore.getState().upsertPackage(saved);
      usePublicPackagesStore.getState().invalidate();
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      set({ isSaving: false, error: message });
      throw err;
    }
  },

  remove: async () => {
    const { pkg } = get();
    if (!pkg) throw new Error('No package to delete');

    set({ error: null });
    try {
      await packageService.remove(pkg.id);
      usePackagesAdminStore.getState().removePackage(pkg.id);
      usePublicPackagesStore.getState().invalidate();
      get().clear();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      set({ error: message });
      throw err;
    }
  },

  clear: () =>
    set({
      pkg: null,
      draft: null,
      isCreate: false,
      isLoading: false,
      isSaving: false,
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
