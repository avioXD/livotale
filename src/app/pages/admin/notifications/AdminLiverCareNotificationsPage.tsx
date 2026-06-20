import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_NOTIFICATION_LOG_FILTERS,
  useNotificationLogStore,
} from '@/store';
import type { NotificationLogEntry } from '@/services/external/types';
import type { TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

export function AdminLiverCareNotificationsPage() {
  const {
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    isLoading,
    error,
    fetchItems,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = useNotificationLogStore(
    useShallow((s) => ({
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      isLoading: s.isLoading,
      error: s.error,
      fetchItems: s.fetchItems,
      setSearchInput: s.setSearchInput,
      setDraftFilter: s.setDraftFilter,
      applyFilters: s.applyFilters,
      resetFilters: s.resetFilters,
      setPage: s.setPage,
      setPageSize: s.setPageSize,
      setFiltersExpanded: s.setFiltersExpanded,
    })),
  );

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const paged = useStorePaged(
    useNotificationLogStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_NOTIFICATION_LOG_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<NotificationLogEntry>[] = useMemo(
    () => [
      {
        key: 'when',
        header: 'When',
        render: (log) => (log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'),
      },
      {
        key: 'channel',
        header: 'Channel',
        render: (log) => <span className="capitalize">{log.channel}</span>,
      },
      {
        key: 'recipient',
        header: 'Recipient',
        render: (log) => log.recipient,
      },
      {
        key: 'template',
        header: 'Template',
        render: (log) => <span className="max-w-xs truncate">{log.template}</span>,
      },
      {
        key: 'order',
        header: 'Order',
        render: (log) =>
          log.orderId ? (
            <Link to={orgPath(`/admin/orders/${log.orderId}`)} className="text-primary underline">
              {log.orderId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (log) => <Badge variant="outline">{log.status}</Badge>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification log"
        description="WhatsApp, SMS, email, and in-app dispatch history for liver care orders."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={orgPath('/admin/operations')}>Operations hub</Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search recipient, template, order…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Order ID" htmlFor="notif-order-id">
          <input
            id="notif-order-id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="UUID"
            value={draftFilters.orderId}
            onChange={(e) => setDraftFilter('orderId', e.target.value)}
          />
        </FilterField>
        <FilterField label="Channel" htmlFor="notif-channel">
          <select
            id="notif-channel"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.channel}
            onChange={(e) => setDraftFilter('channel', e.target.value)}
          >
            <option value="">All channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="in_app">In-app</option>
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No notifications logged yet. Enquiry intake, payment links, and report publish events appear here."
        getRowKey={(log) => log.id}
      />

      <PaginationControls
        page={paged.page}
        pageSize={pageSize}
        total={paged.total}
        totalPages={paged.totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
