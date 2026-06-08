import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { PartnerLab, PartnerLabDetail, UpdatePartnerLabInput } from '@/types/partnerLab';
import { MOCK_LIVER_ORDERS } from './liverCare.mock';
import { buildPartnerLabStats, estimatePartnerLabBilling } from './partnerLab.stats';
import { MOCK_LAB_REPORTS, MOCK_PARTNER_LABS, MOCK_SAMPLE_DISPATCHES } from './pathology.mock';

class PartnerLabService extends BaseApiService {
  async listSummaries(activeOnly = true): Promise<Array<PartnerLab & { reportsUploaded: number; inPipeline: number }>> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_PARTNER_LABS];
        if (activeOnly) rows = rows.filter((l) => l.active);
        return rows
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((lab) => {
            const stats = buildPartnerLabStats(lab.id, MOCK_LIVER_ORDERS, MOCK_SAMPLE_DISPATCHES, MOCK_LAB_REPORTS);
            return { ...lab, reportsUploaded: stats.reportsUploaded, inPipeline: stats.inPipeline };
          });
      },
      () =>
        this.get<Array<PartnerLab & { reportsUploaded: number; inPipeline: number }>>('/admin/staff/lab-partners/summaries', {
          params: { activeOnly },
        }),
    );
  }

  async list(activeOnly = true): Promise<PartnerLab[]> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_PARTNER_LABS];
        if (activeOnly) rows = rows.filter((l) => l.active);
        return rows.sort((a, b) => a.name.localeCompare(b.name));
      },
      () => this.get<PartnerLab[]>('/admin/staff/lab-partners', { params: { activeOnly } }),
    );
  }

  async getById(id: string): Promise<PartnerLab | null> {
    return mockOrApi(
      () => MOCK_PARTNER_LABS.find((l) => l.id === id) ?? null,
      () => this.get<PartnerLab>(`/admin/staff/lab-partners/${id}`),
    );
  }

  async getDetail(id: string): Promise<PartnerLabDetail | null> {
    return mockOrApi(
      () => {
        const lab = MOCK_PARTNER_LABS.find((l) => l.id === id);
        if (!lab) return null;
        const stats = buildPartnerLabStats(id, MOCK_LIVER_ORDERS, MOCK_SAMPLE_DISPATCHES, MOCK_LAB_REPORTS);
        return {
          ...lab,
          stats,
          estimatedBillingInr: estimatePartnerLabBilling(stats, lab.chargesPerTest, lab.packageCharges),
        };
      },
      () => this.get<PartnerLabDetail>(`/admin/staff/lab-partners/${id}/detail`),
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
      () => this.patch<PartnerLab>(`/admin/staff/lab-partners/${id}`, input),
    );
  }
}

export const partnerLabService = new PartnerLabService();
