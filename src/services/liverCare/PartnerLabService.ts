import { BaseApiService } from '@/services/base';
import type { CreatePartnerLabInput, PartnerLab, PartnerLabDetail, UpdatePartnerLabInput } from '@/types/partnerLab';
class PartnerLabService extends BaseApiService {
  async listSummaries(activeOnly = true): Promise<Array<PartnerLab & { reportsUploaded: number; inPipeline: number }>> {
    return this.get<Array<PartnerLab & { reportsUploaded: number; inPipeline: number }>>('/admin/staff/lab-partners/summaries', {
          params: { activeOnly },
        })
  }

  async list(activeOnly = true): Promise<PartnerLab[]> {
    return this.get<PartnerLab[]>('/admin/staff/lab-partners', { params: { activeOnly } })
  }

  async getById(id: string): Promise<PartnerLab | null> {
    return this.get<PartnerLab>(`/admin/staff/lab-partners/${id}`)
  }

  async getDetail(id: string): Promise<PartnerLabDetail | null> {
    return this.get<PartnerLabDetail>(`/admin/staff/lab-partners/${id}/detail`)
  }

  async create(input: CreatePartnerLabInput): Promise<PartnerLab> {
    return this.post<PartnerLab>('/admin/staff/lab-partners', input)
  }

  async update(id: string, input: UpdatePartnerLabInput): Promise<PartnerLab> {
    return this.patch<PartnerLab>(`/admin/staff/lab-partners/${id}`, input)
  }
}

export const partnerLabService = new PartnerLabService();
