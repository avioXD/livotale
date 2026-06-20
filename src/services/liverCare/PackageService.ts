import { BaseApiService } from '@/services/base';
import type { CreatePackageInput, LiverCarePackage, UpdatePackageInput } from '@/types/package';
import { bulletsFromSections } from './package.utils';
function normalizePackageInput(input: CreatePackageInput | UpdatePackageInput): CreatePackageInput | UpdatePackageInput {
  if (!input.checklistSections) return input;
  return {
    ...input,
    includes: { bullets: bulletsFromSections(input.checklistSections) },
  };
}

class PackageService extends BaseApiService {
  async listPublic(): Promise<LiverCarePackage[]> {
    return this.get<LiverCarePackage[]>('/public/packages')
  }

  async getByCode(code: string): Promise<LiverCarePackage | null> {
    return this.get<LiverCarePackage>(`/public/packages/${code}`)
  }

  async listAdmin(): Promise<LiverCarePackage[]> {
    return this.get<LiverCarePackage[]>('/admin/packages')
  }

  async getById(id: string): Promise<LiverCarePackage | null> {
    return this.get<LiverCarePackage>(`/admin/packages/${id}`)
  }

  async update(id: string, input: UpdatePackageInput): Promise<LiverCarePackage> {
    const payload = normalizePackageInput(input);
    return this.patch<LiverCarePackage>(`/admin/packages/${id}`, payload)
  }

  async create(input: CreatePackageInput): Promise<LiverCarePackage> {
    const payload = normalizePackageInput(input) as CreatePackageInput;
    return this.post<LiverCarePackage>('/admin/packages', payload)
  }

  async remove(id: string): Promise<void> {
    return super.delete<void>(`/admin/packages/${id}`)
  }
}

export const packageService = new PackageService();
