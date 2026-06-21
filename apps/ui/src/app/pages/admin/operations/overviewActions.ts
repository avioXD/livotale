import { orgPath } from '@/app/config/orgRoutes';
import type { OperationsOverview, OperationsTab } from '@/types/adminOperations';

/** Query keys used by ops hub tabs — cleared on tab switch to avoid stale filters. */
export const OPS_TAB_QUERY_KEYS = [
  'paymentStatus',
  'orderStatus',
  'createdBy',
  'assignedTo',
  'status',
  'dispatchStatus',
  'labId',
  'extractionStatus',
  'stage',
] as const;

export type OverviewActionType = 'link' | 'tab';

export interface OverviewQuickAction {
  label: string;
  type: OverviewActionType;
  /** External route for type=link */
  path?: string;
  /** Ops hub tab for type=tab */
  tab?: OperationsTab;
  params?: Record<string, string>;
}

export function opsHubHref(tab?: OperationsTab, params?: Record<string, string>): string {
  const search = new URLSearchParams();
  if (tab && tab !== 'overview') {
    search.set('tab', tab);
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const qs = search.toString();
  return orgPath(`/admin/operations${qs ? `?${qs}` : ''}`);
}

export const OVERVIEW_QUICK_ACTIONS: OverviewQuickAction[] = [
  {
    label: 'Book walk-in',
    type: 'link',
    path: orgPath('/admin/appointments/book'),
  },
  {
    label: 'Pending payments',
    type: 'tab',
    tab: 'orders',
    params: { paymentStatus: 'link_sent' },
  },
  {
    label: 'Missed today',
    type: 'link',
    path: orgPath('/admin/appointments/missed'),
  },
  {
    label: 'Lab partner queue',
    type: 'tab',
    tab: 'partner-lab',
    params: { status: 'pending_dispatch' },
  },
  {
    label: 'Enquiry queue',
    type: 'tab',
    tab: 'enquiries',
  },
  {
    label: 'Collect payments',
    type: 'tab',
    tab: 'orders',
    params: { paymentStatus: 'pending' },
  },
];

export interface OverviewKpiDefinition {
  label: string;
  hint: string;
  href: string;
  formatValue: (overview: OperationsOverview) => string | number;
}

export const OVERVIEW_KPI_DEFINITIONS: OverviewKpiDefinition[] = [
  {
    label: "Today's appointments",
    hint: 'Open consultation queue',
    href: opsHubHref('appointments'),
    formatValue: (o) => o.appointmentsToday,
  },
  {
    label: 'Pending assignments',
    hint: 'Orders with no technician or doctor',
    href: opsHubHref('orders', { assignedTo: 'unassigned' }),
    formatValue: (o) => o.pendingAssignments,
  },
  {
    label: 'Missed / no-show today',
    hint: 'Open missed appointments queue',
    href: orgPath('/admin/appointments/missed'),
    formatValue: (o) => o.missedToday,
  },
  {
    label: 'Samples awaiting assign',
    hint: 'Lab not yet assigned on home collection orders',
    href: opsHubHref('partner-lab', { status: 'not_started' }),
    formatValue: (o) => o.samplesPendingAssign,
  },
  {
    label: 'Unpaid orders',
    hint: 'All non-paid liver care orders',
    href: opsHubHref('orders', { paymentStatus: 'unpaid' }),
    formatValue: (o) => o.unpaidOrders,
  },
  {
    label: 'Collected today',
    hint: 'Paid orders — cash, QR & online',
    href: opsHubHref('orders', { paymentStatus: 'success' }),
    formatValue: (o) => `₹${o.collectedToday.toLocaleString('en-IN')}`,
  },
];
