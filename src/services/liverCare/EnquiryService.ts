import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  AddEnquiryFollowUpInput,
  CreateEnquiryInput,
  Enquiry,
  EnquiryFollowUpLog,
  EnquiryStatus,
  UpdateEnquiryInput,
} from '@/types/enquiry';
import {
  inheritedPatientIdFromThread,
  latestPerThread,
  nextThreadSequence,
  threadCounts,
  threadIdFromPhone,
} from '@/utils/enquiryThread';
import { MOCK_ENQUIRIES, MOCK_PACKAGES, nextEnquiryNumber } from './liverCare.mock';

function buildEnquiry(input: CreateEnquiryInput, siblings: Enquiry[]): Enquiry {
  const threadId = threadIdFromPhone(input.phone);
  const threadSequence = nextThreadSequence(siblings, threadId);
  const inheritedPatientId = inheritedPatientIdFromThread(
    siblings.filter((e) => e.threadId === threadId),
  );
  const pkg = input.preferredPackageId
    ? MOCK_PACKAGES.find((p) => p.id === input.preferredPackageId)
    : undefined;

  return {
    id: `enq-${Date.now()}`,
    enquiryNumber: nextEnquiryNumber(),
    threadId,
    threadSequence,
    source: input.source,
    patientName: input.patientName,
    phone: input.phone,
    email: input.email ?? null,
    age: input.age ?? null,
    gender: input.gender ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    preferredPackageId: input.preferredPackageId ?? null,
    preferredPackageCode: pkg?.code ?? null,
    message: input.message ?? null,
    enquiryAt: new Date().toISOString(),
    status: 'new',
    patientId: inheritedPatientId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

class EnquiryService extends BaseApiService {
  async list(params?: { status?: EnquiryStatus; source?: string; search?: string }): Promise<Enquiry[]> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_ENQUIRIES];
        if (params?.status) rows = rows.filter((e) => e.status === params.status);
        if (params?.source) rows = rows.filter((e) => e.source === params.source);
        if (params?.search) {
          const q = params.search.toLowerCase();
          rows = rows.filter(
            (e) =>
              e.patientName.toLowerCase().includes(q) ||
              e.phone.includes(q) ||
              e.enquiryNumber.toLowerCase().includes(q),
          );
        }
        const counts = threadCounts(rows);
        const latest = latestPerThread(rows);
        return latest
          .map((e) => ({ ...e, threadCount: counts.get(e.threadId) ?? 1 }))
          .sort((a, b) => new Date(b.enquiryAt).getTime() - new Date(a.enquiryAt).getTime());
      },
      () => this.get<Enquiry[]>('/admin/enquiries', { params }),
    );
  }

  async getById(id: string): Promise<Enquiry | null> {
    return mockOrApi(
      () => MOCK_ENQUIRIES.find((e) => e.id === id) ?? null,
      () => this.get<Enquiry>(`/admin/enquiries/${id}`),
    );
  }

  async getThread(threadId: string): Promise<Enquiry[]> {
    return mockOrApi(
      () =>
        MOCK_ENQUIRIES.filter((e) => e.threadId === threadId).sort(
          (a, b) => a.threadSequence - b.threadSequence,
        ),
      () => this.get<Enquiry[]>(`/admin/enquiries/threads/${threadId}`),
    );
  }

  async create(input: CreateEnquiryInput): Promise<Enquiry> {
    return mockOrApi(
      () => {
        const enquiry = buildEnquiry(input, MOCK_ENQUIRIES);
        MOCK_ENQUIRIES.unshift(enquiry);
        return enquiry;
      },
      () => this.post<Enquiry>('/admin/enquiries', input),
    );
  }

  async createPublic(input: Omit<CreateEnquiryInput, 'source'>): Promise<Enquiry> {
    return this.create({ ...input, source: 'website' });
  }

  /** Ops: start a new enquiry thread for a returning converted lead. */
  async createNewThread(fromEnquiryId: string, message?: string): Promise<Enquiry> {
    return mockOrApi(
      async () => {
        const parent = MOCK_ENQUIRIES.find((e) => e.id === fromEnquiryId);
        if (!parent) throw new Error('Enquiry not found');
        return this.create({
          source: 'manual',
          patientName: parent.patientName,
          phone: parent.phone,
          email: parent.email ?? undefined,
          city: parent.city ?? undefined,
          preferredPackageId: parent.preferredPackageId ?? undefined,
          message: message ?? 'Return enquiry — patient contacted ops again.',
        });
      },
      () => this.post<Enquiry>(`/admin/enquiries/${fromEnquiryId}/new-thread`, { message }),
    );
  }

  async addFollowUp(id: string, input: AddEnquiryFollowUpInput): Promise<Enquiry> {
    return mockOrApi(
      () => {
        const idx = MOCK_ENQUIRIES.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error('Enquiry not found');
        const existing = MOCK_ENQUIRIES[idx];
        const log: EnquiryFollowUpLog = {
          id: `fu-${Date.now()}`,
          status: input.status,
          internalNotes: input.internalNotes?.trim() || null,
          callRemarks: input.callRemarks?.trim() || null,
          followUpAt: input.followUpAt ?? null,
          createdAt: new Date().toISOString(),
          createdByName: input.createdByName ?? 'Operations Team',
        };
        const followUpLogs = [...(existing.followUpLogs ?? []), log];
        MOCK_ENQUIRIES[idx] = {
          ...existing,
          status: input.status,
          followUpAt: log.followUpAt,
          internalNotes: log.internalNotes ?? existing.internalNotes,
          callRemarks: log.callRemarks ?? existing.callRemarks,
          followUpLogs,
          updatedAt: new Date().toISOString(),
        };
        return MOCK_ENQUIRIES[idx];
      },
      () => this.post<Enquiry>(`/admin/enquiries/${id}/follow-ups`, input),
    );
  }

  async update(id: string, input: UpdateEnquiryInput): Promise<Enquiry> {
    return mockOrApi(
      () => {
        const idx = MOCK_ENQUIRIES.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error('Enquiry not found');
        const pkg = input.preferredPackageId
          ? MOCK_PACKAGES.find((p) => p.id === input.preferredPackageId)
          : undefined;
        MOCK_ENQUIRIES[idx] = {
          ...MOCK_ENQUIRIES[idx],
          ...input,
          preferredPackageCode: pkg?.code ?? MOCK_ENQUIRIES[idx].preferredPackageCode,
          updatedAt: new Date().toISOString(),
        };
        return MOCK_ENQUIRIES[idx];
      },
      () => this.patch<Enquiry>(`/admin/enquiries/${id}`, input),
    );
  }
}

export const enquiryService = new EnquiryService();
