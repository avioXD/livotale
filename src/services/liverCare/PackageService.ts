import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { CreatePackageInput, LiverCarePackage, UpdatePackageInput } from '@/types/package';
import { bulletsFromSections } from './package.utils';
import { MOCK_LIVER_ORDERS, MOCK_PACKAGES } from './liverCare.mock';

function normalizePackageInput(input: CreatePackageInput | UpdatePackageInput): CreatePackageInput | UpdatePackageInput {
  if (!input.checklistSections) return input;
  return {
    ...input,
    includes: { bullets: bulletsFromSections(input.checklistSections) },
  };
}

class PackageService extends BaseApiService {
  async listPublic(): Promise<LiverCarePackage[]> {
    return mockOrApi(
      () => MOCK_PACKAGES.filter((p) => p.active && p.visibilityWeb).sort((a, b) => a.sortOrder - b.sortOrder),
      () => this.get<LiverCarePackage[]>('/public/packages'),
    );
  }

  async getByCode(code: string): Promise<LiverCarePackage | null> {
    return mockOrApi(
      () => MOCK_PACKAGES.find((p) => p.code === code) ?? null,
      () => this.get<LiverCarePackage>(`/public/packages/${code}`),
    );
  }

  async listAdmin(): Promise<LiverCarePackage[]> {
    return mockOrApi(
      () => [...MOCK_PACKAGES].sort((a, b) => a.sortOrder - b.sortOrder),
      () => this.get<LiverCarePackage[]>('/admin/packages'),
    );
  }

  async getById(id: string): Promise<LiverCarePackage | null> {
    return mockOrApi(
      () => MOCK_PACKAGES.find((p) => p.id === id) ?? null,
      () => this.get<LiverCarePackage>(`/admin/packages/${id}`),
    );
  }

  async update(id: string, input: UpdatePackageInput): Promise<LiverCarePackage> {
    const payload = normalizePackageInput(input);
    return mockOrApi(
      () => {
        const idx = MOCK_PACKAGES.findIndex((p) => p.id === id);
        if (idx < 0) throw new Error('Package not found');
        MOCK_PACKAGES[idx] = { ...MOCK_PACKAGES[idx], ...payload, updatedAt: new Date().toISOString() };
        return MOCK_PACKAGES[idx];
      },
      () => this.patch<LiverCarePackage>(`/admin/packages/${id}`, payload),
    );
  }

  async create(input: CreatePackageInput): Promise<LiverCarePackage> {
    const payload = normalizePackageInput(input) as CreatePackageInput;
    return mockOrApi(
      () => {
        if (MOCK_PACKAGES.some((p) => p.code === payload.code)) {
          throw new Error(`Package code ${payload.code} already exists`);
        }
        const pkg: LiverCarePackage = {
          ...payload,
          id: `pkg-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_PACKAGES.push(pkg);
        return pkg;
      },
      () => this.post<LiverCarePackage>('/admin/packages', payload),
    );
  }

  async remove(id: string): Promise<void> {
    return mockOrApi(
      () => {
        const pkg = MOCK_PACKAGES.find((p) => p.id === id);
        if (!pkg) throw new Error('Package not found');
        const inUse = MOCK_LIVER_ORDERS.some((o) => o.packageId === id || o.packageCode === pkg.code);
        if (inUse) throw new Error('Cannot delete — package is referenced by existing orders');
        const idx = MOCK_PACKAGES.findIndex((p) => p.id === id);
        MOCK_PACKAGES.splice(idx, 1);
      },
      () => super.delete<void>(`/admin/packages/${id}`),
    );
  }
}

export const packageService = new PackageService();
