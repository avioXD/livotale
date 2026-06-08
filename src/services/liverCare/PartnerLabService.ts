import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { PartnerLab, UpdatePartnerLabInput } from '@/types/partnerLab';
import { MOCK_PARTNER_LABS } from './pathology.mock';

class PartnerLabService extends BaseApiService {
  async list(activeOnly = true): Promise<PartnerLab[]> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_PARTNER_LABS];
        if (activeOnly) rows = rows.filter((l) => l.active);
        return rows.sort((a, b) => a.name.localeCompare(b.name));
      },
      () => this.get<PartnerLab[]>('/admin/lab-partners', { params: { activeOnly } }),
    );
  }

  async getById(id: string): Promise<PartnerLab | null> {
    return mockOrApi(
      () => MOCK_PARTNER_LABS.find((l) => l.id === id) ?? null,
      () => this.get<PartnerLab>(`/admin/lab-partners/${id}`),
    );
  }

  async update(id: string, input: UpdatePartnerLabInput): Promise<PartnerLab> {
    return mockOrApi(
      () => {
        const idx = MOCK_PARTNER_LABS.findIndex((l) => l.id === id);
        if (idx < 0) throw new Error('Lab not found');
        MOCK_PARTNER_LABS[idx] = { ...MOCK_PARTNER_LABS[idx], ...input, updatedAt: new Date().toISOString() };
        return MOCK_PARTNER_LABS[idx];
      },
      () => this.patch<PartnerLab>(`/admin/lab-partners/${id}`, input),
    );
  }
}

export const partnerLabService = new PartnerLabService();
