import { BaseApiService } from '@/services/base';
import type {
  AddEnquiryFollowUpInput,
  CreateEnquiryInput,
  Enquiry,
  EnquiryStatus,
  UpdateEnquiryInput,
} from '@/types/enquiry';

class EnquiryService extends BaseApiService {
  async list(params?: { status?: EnquiryStatus; source?: string; search?: string }): Promise<Enquiry[]> {
    return this.get<Enquiry[]>('/admin/enquiries', { params })
  }

  async getById(id: string): Promise<Enquiry | null> {
    return this.get<Enquiry>(`/admin/enquiries/${id}`)
  }

  async getThread(threadId: string): Promise<Enquiry[]> {
    return this.get<Enquiry[]>(`/admin/enquiries/threads/${threadId}`)
  }

  async create(input: CreateEnquiryInput): Promise<Enquiry> {
    return this.post<Enquiry>('/admin/enquiries', input)
  }

  async createPublic(input: Omit<CreateEnquiryInput, 'source'>): Promise<Enquiry> {
    return this.post<Enquiry>('/public/enquiries', input)
  }

  /** Ops: start a new enquiry thread for a returning converted lead. */
  async createNewThread(fromEnquiryId: string, message?: string): Promise<Enquiry> {
    return this.post<Enquiry>(`/admin/enquiries/${fromEnquiryId}/new-thread`, { message })
  }

  async addFollowUp(id: string, input: AddEnquiryFollowUpInput): Promise<Enquiry> {
    return this.post<Enquiry>(`/admin/enquiries/${id}/follow-ups`, input)
  }

  async update(id: string, input: UpdateEnquiryInput): Promise<Enquiry> {
    return this.patch<Enquiry>(`/admin/enquiries/${id}`, input)
  }

  async archive(id: string): Promise<void> {
    await super.delete<void>(`/admin/enquiries/${id}`);
  }
}

export const enquiryService = new EnquiryService();
