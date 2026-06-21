import { createClientListStore } from '@/store/createClientListStore';
import { bankDetailsService } from '@/services/bank/BankDetailsService';
import type { BankDetailsDirectoryRow, BankVerificationStatus } from '@/types/bankDetails';

export interface BankDirectoryFilters extends Record<string, unknown> {
  status: 'all' | BankVerificationStatus;
  role: string;
}

const DEFAULT_FILTERS: BankDirectoryFilters = { status: 'all', role: 'all' };

export const useBankDirectoryStore = createClientListStore<BankDetailsDirectoryRow, BankDirectoryFilters>({
  defaultFilters: DEFAULT_FILTERS,
  fetchFn: async ({ search, filters }) => {
    return bankDetailsService.listDirectory({
      q: search || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      role: filters.role === 'all' ? undefined : filters.role,
    });
  },
});

export { DEFAULT_FILTERS as DEFAULT_BANK_DIRECTORY_FILTERS };
