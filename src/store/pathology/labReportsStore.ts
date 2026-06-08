import { create } from 'zustand';
import {
  aiExtractionOrderService,
  liverCareOrderService,
  partnerLabService,
  pathologyService,
} from '@/services/liverCare';
import type { UploadLabReportFromEmailInput, UploadLabReportResult } from '@/services/liverCare/PathologyService';
import type { AIExtractionJob, ExtractedField } from '@/types/aiExtraction';
import type { LabReportQueueRow, LabReportUpload } from '@/types/labReport';
import type { PartnerLab } from '@/types/partnerLab';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';

interface LabReportsStore {
  queue: LabReportQueueRow[];
  searchInput: string;
  appliedSearch: string;
  draftDispatch: string;
  appliedDispatch: string;
  draftLab: string;
  appliedLab: string;
  draftAi: string;
  appliedAi: string;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  activeOrderId: string | null;
  activeOrder: LiverCareOrder | null;
  report: LabReportUpload | null;
  dispatch: SampleDispatch | null;
  aiJob: AIExtractionJob | null;
  partnerLabs: PartnerLab[];
  orderLoading: boolean;
  orderSaving: boolean;
  orderError: string | null;

  fetchQueue: () => Promise<void>;
  upsertQueueRow: (row: LabReportQueueRow) => void;
  refreshQueueRow: (orderId: string) => Promise<void>;

  setSearchInput: (v: string) => void;
  setDraftDispatch: (v: string) => void;
  setDraftLab: (v: string) => void;
  setDraftAi: (v: string) => void;
  applyFilters: () => void;
  resetFilters: (defaultAi?: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getFilteredQueue: () => LabReportQueueRow[];
  getPagedQueue: () => ReturnType<typeof paginateList<LabReportQueueRow>>;

  loadOrder: (orderId: string) => Promise<void>;
  clearOrder: () => void;

  assignLab: (orderId: string, partnerLabId: string) => Promise<void>;
  markSampleCollected: (orderId: string, collectedBy: string) => Promise<void>;
  dispatchSample: (orderId: string, dispatchedBy: string, courierRef?: string) => Promise<void>;
  markReceivedAtLab: (orderId: string) => Promise<void>;
  markAwaitingReport: (orderId: string) => Promise<void>;
  uploadReportFromEmail: (
    orderId: string,
    input: UploadLabReportFromEmailInput,
  ) => Promise<UploadLabReportResult>;
  triggerExtraction: (orderId: string) => Promise<void>;
  updateExtractionFields: (orderId: string, fields: ExtractedField[]) => Promise<void>;
  verifyExtraction: (orderId: string) => Promise<void>;
  requestReupload: (orderId: string) => Promise<void>;
}

async function reloadOrderContext(orderId: string) {
  const [order, report, dispatch, aiJob, partnerLabs] = await Promise.all([
    liverCareOrderService.getById(orderId),
    pathologyService.getReport(orderId),
    pathologyService.getSampleDispatch(orderId),
    aiExtractionOrderService.getJobForOrder(orderId),
    partnerLabService.list(),
  ]);
  return { order, report, dispatch, aiJob, partnerLabs };
}

export const useLabReportsStore = create<LabReportsStore>((set, get) => ({
  queue: [],
  searchInput: '',
  appliedSearch: '',
  draftDispatch: '',
  appliedDispatch: '',
  draftLab: '',
  appliedLab: '',
  draftAi: '',
  appliedAi: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  isLoading: false,
  error: null,

  activeOrderId: null,
  activeOrder: null,
  report: null,
  dispatch: null,
  aiJob: null,
  partnerLabs: [],
  orderLoading: false,
  orderSaving: false,
  orderError: null,

  fetchQueue: async () => {
    const { appliedSearch, appliedDispatch, appliedLab, appliedAi } = get();
    set({ isLoading: true, error: null });
    try {
      const [queue, partnerLabs] = await Promise.all([
        pathologyService.listLabReportQueue({
          search: appliedSearch || undefined,
          dispatchStatus: appliedDispatch || undefined,
          labId: appliedLab || undefined,
          extractionStatus: appliedAi || undefined,
        }),
        partnerLabService.list().catch(() => [] as PartnerLab[]),
      ]);
      set({ queue, partnerLabs, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load lab reports',
      });
    }
  },

  upsertQueueRow: (row) => {
    const queue = get().queue;
    const idx = queue.findIndex((r) => r.orderId === row.orderId);
    if (idx < 0) {
      set({ queue: [row, ...queue].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) });
      return;
    }
    const next = [...queue];
    next[idx] = row;
    set({ queue: next });
  },

  refreshQueueRow: async (orderId) => {
    const row = await pathologyService.getLabReportQueueRow(orderId);
    if (row) get().upsertQueueRow(row);
  },

  setSearchInput: (v) => set({ searchInput: v }),
  setDraftDispatch: (v) => set({ draftDispatch: v }),
  setDraftLab: (v) => set({ draftLab: v }),
  setDraftAi: (v) => set({ draftAi: v }),

  applyFilters: () => {
    set({
      appliedSearch: get().searchInput.trim().toLowerCase(),
      appliedDispatch: get().draftDispatch,
      appliedLab: get().draftLab,
      appliedAi: get().draftAi,
      page: 1,
    });
    void get().fetchQueue();
  },

  resetFilters: (defaultAi = '') => {
    set({
      searchInput: '',
      draftDispatch: '',
      draftLab: '',
      draftAi: defaultAi,
      appliedSearch: '',
      appliedDispatch: '',
      appliedLab: '',
      appliedAi: defaultAi,
      page: 1,
    });
    void get().fetchQueue();
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  getFilteredQueue: () => get().queue,

  getPagedQueue: () => {
    const { queue, page, pageSize } = get();
    return paginateList(queue, page, pageSize);
  },

  loadOrder: async (orderId) => {
    set({ activeOrderId: orderId, orderLoading: true, orderError: null });
    try {
      const ctx = await reloadOrderContext(orderId);
      set({
        activeOrder: ctx.order,
        report: ctx.report,
        dispatch: ctx.dispatch,
        aiJob: ctx.aiJob,
        partnerLabs: ctx.partnerLabs,
        orderLoading: false,
      });
    } catch (err) {
      set({
        orderLoading: false,
        orderError: err instanceof Error ? err.message : 'Failed to load lab workflow',
      });
    }
  },

  clearOrder: () =>
    set({
      activeOrderId: null,
      activeOrder: null,
      report: null,
      dispatch: null,
      aiJob: null,
      orderError: null,
    }),

  assignLab: async (orderId, partnerLabId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const dispatch = await pathologyService.assignLab(orderId, partnerLabId);
      const ctx = await reloadOrderContext(orderId);
      set({
        activeOrder: ctx.order,
        report: ctx.report,
        dispatch,
        aiJob: ctx.aiJob,
        partnerLabs: ctx.partnerLabs,
        orderSaving: false,
      });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to assign lab',
      });
      throw err;
    }
  },

  markSampleCollected: async (orderId, collectedBy) => {
    set({ orderSaving: true, orderError: null });
    try {
      const dispatch = await pathologyService.markSampleCollected(orderId, collectedBy);
      set({ dispatch, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to mark sample collected',
      });
      throw err;
    }
  },

  dispatchSample: async (orderId, dispatchedBy, courierRef) => {
    set({ orderSaving: true, orderError: null });
    try {
      const dispatch = await pathologyService.dispatchSample(orderId, dispatchedBy, courierRef);
      const ctx = await reloadOrderContext(orderId);
      set({
        activeOrder: ctx.order,
        report: ctx.report,
        dispatch,
        aiJob: ctx.aiJob,
        orderSaving: false,
      });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to dispatch sample',
      });
      throw err;
    }
  },

  markReceivedAtLab: async (orderId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const dispatch = await pathologyService.markReceivedAtLab(orderId);
      set({ dispatch, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to update sample status',
      });
      throw err;
    }
  },

  markAwaitingReport: async (orderId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const dispatch = await pathologyService.markAwaitingReport(orderId);
      set({ dispatch, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to mark awaiting report',
      });
      throw err;
    }
  },

  uploadReportFromEmail: async (orderId, input) => {
    set({ orderSaving: true, orderError: null });
    try {
      const result = await pathologyService.uploadReportFromEmail(orderId, input);
      const ctx = await reloadOrderContext(orderId);
      set({
        activeOrder: ctx.order,
        report: result.report,
        dispatch: ctx.dispatch,
        aiJob: result.extractionJob,
        orderSaving: false,
      });
      await get().refreshQueueRow(orderId);
      return result;
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to upload lab PDF',
      });
      throw err;
    }
  },

  triggerExtraction: async (orderId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const aiJob = await aiExtractionOrderService.triggerExtraction(orderId);
      const report = await pathologyService.getReport(orderId);
      set({ aiJob, report, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to run AI extraction',
      });
      throw err;
    }
  },

  updateExtractionFields: async (orderId, fields) => {
    set({ orderSaving: true, orderError: null });
    try {
      const aiJob = await aiExtractionOrderService.updateFields(orderId, fields);
      set({ aiJob, orderSaving: false });
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to save fields',
      });
      throw err;
    }
  },

  verifyExtraction: async (orderId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const aiJob = await aiExtractionOrderService.verifyExtraction(orderId);
      const [report, order] = await Promise.all([
        pathologyService.getReport(orderId),
        liverCareOrderService.getById(orderId),
      ]);
      set({ aiJob, report, activeOrder: order, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to verify extraction',
      });
      throw err;
    }
  },

  requestReupload: async (orderId) => {
    set({ orderSaving: true, orderError: null });
    try {
      const aiJob = await aiExtractionOrderService.requestReupload(orderId);
      const report = await pathologyService.getReport(orderId);
      set({ aiJob, report, orderSaving: false });
      await get().refreshQueueRow(orderId);
    } catch (err) {
      set({
        orderSaving: false,
        orderError: err instanceof Error ? err.message : 'Failed to request re-upload',
      });
      throw err;
    }
  },
}));
