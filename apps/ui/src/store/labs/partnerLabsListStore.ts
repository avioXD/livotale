import { createClientListStore } from '@/store/createClientListStore';
import { partnerLabService } from '@/services/liverCare';
import type { PartnerLab } from '@/types/partnerLab';

export type PartnerLabListRow = PartnerLab & { reportsUploaded: number; inPipeline: number };

export interface PartnerLabsListFilters extends Record<string, unknown> {
  status: '' | 'active' | 'inactive';
}

const DEFAULT_FILTERS: PartnerLabsListFilters = { status: '' };

export const usePartnerLabsListStore = createClientListStore<PartnerLabListRow, PartnerLabsListFilters>({
  defaultFilters: DEFAULT_FILTERS,
  fetchFn: async ({ search, filters }) => {
    let rows = await partnerLabService.listSummaries(false);
    if (filters.status === 'active') rows = rows.filter((r) => r.active);
    if (filters.status === 'inactive') rows = rows.filter((r) => !r.active);
    const q = search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.contactPerson.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    return rows;
  },
});

export { DEFAULT_FILTERS as DEFAULT_PARTNER_LABS_FILTERS };
