import axios from 'axios';
import { BaseApiService } from '@/services/base';
import type {
  BankDetailsDirectoryFilters,
  BankDetailsDirectoryRow,
  BankDetailsFull,
  BankDetailsMasked,
  BankDetailsSelfResponse,
  UpsertBankDetailsInput,
} from '@/types/bankDetails';

class BankDetailsService extends BaseApiService {
  async getMine(): Promise<BankDetailsSelfResponse> {
    try {
      return await this.get<BankDetailsSelfResponse>('/me/bank-details', {
        headers: { 'X-Skip-Error-Toast': 'true' },
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return { configured: false };
      }
      throw err instanceof Error ? err : new Error('Failed to load bank details');
    }
  }

  async upsertMine(body: UpsertBankDetailsInput): Promise<BankDetailsFull> {
    return this.put<BankDetailsFull>('/me/bank-details', body);
  }

  async getForUser(userId: string): Promise<BankDetailsFull | BankDetailsMasked | null> {
    try {
      return await this.get<BankDetailsFull | BankDetailsMasked>(
        `/admin/users/${userId}/bank-details`,
        { headers: { 'X-Skip-Error-Toast': 'true' } },
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw err instanceof Error ? err : new Error('Failed to load bank details');
    }
  }

  async verify(
    userId: string,
    status: 'verified' | 'rejected',
    notes?: string,
  ): Promise<BankDetailsFull> {
    return this.post<BankDetailsFull>(`/admin/users/${userId}/bank-details/verify`, {
      status,
      notes,
    });
  }

  async listDirectory(filters?: BankDetailsDirectoryFilters): Promise<BankDetailsDirectoryRow[]> {
    return this.get<BankDetailsDirectoryRow[]>('/admin/bank-details', { params: filters });
  }
}

export const bankDetailsService = new BankDetailsService();
