import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { FiMapPin, FiPlus } from 'react-icons/fi';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { orgPath } from '@/app/config/orgRoutes';
import { isSuperAdmin } from '@/app/config/productRoles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DEFAULT_SERVICE_ZONES_FILTERS,
  filterZones,
  useServiceZonesStore,
  useUserRole,
} from '@/store';
import { serviceZoneService } from '@/services/orgScope';
import type { ServiceZone } from '@/types/serviceZone';
import type { TableColumn } from '@/types';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

export function AdminServiceZonesPage() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const canManage = isSuperAdmin(userRole);
  const {
    isLoading,
    error,
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    fetchZones,
    upsertZone,
    removeZone,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = useServiceZonesStore(
    useShallow((s) => ({
      isLoading: s.isLoading,
      error: s.error,
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      fetchZones: s.fetchZones,
      upsertZone: s.upsertZone,
      removeZone: s.removeZone,
      setSearchInput: s.setSearchInput,
      setDraftFilter: s.setDraftFilter,
      applyFilters: s.applyFilters,
      resetFilters: s.resetFilters,
      setPage: s.setPage,
      setPageSize: s.setPageSize,
      setFiltersExpanded: s.setFiltersExpanded,
    })),
  );
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchZones().catch(() => undefined);
  }, [fetchZones]);

  const paged = useStorePaged(
    useServiceZonesStore,
    (s) => ({
      items: filterZones(s.zones, s.appliedSearch, s.appliedFilters),
      page: s.page,
      pageSize: s.pageSize,
    }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_SERVICE_ZONES_FILTERS,
    appliedSearch,
  );

  const toggleActive = useCallback(
    async (zone: ServiceZone) => {
      setActionError(null);
      try {
        const saved = await serviceZoneService.setActive(zone.id, !zone.active);
        upsertZone(saved);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [upsertZone],
  );

  const handleDelete = useCallback(
    async (zone: ServiceZone) => {
      if (!globalThis.confirm(`Remove ${zone.city} and its ${zone.pincodes.length} pincode(s)?`)) return;
      setActionError(null);
      try {
        await serviceZoneService.remove(zone.id);
        removeZone(zone.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to remove service zone');
      }
    },
    [removeZone],
  );

  const columns: TableColumn<ServiceZone>[] = useMemo(
    () => [
      {
        key: 'city',
        header: 'City',
        render: (z) => (
          <div>
            <p className="font-medium">{z.city}</p>
            <p className="text-xs text-muted-foreground">{z.state}</p>
          </div>
        ),
      },
      {
        key: 'pincodes',
        header: 'Serviced pincodes',
        render: (z) => (
          <div className="flex max-w-md flex-wrap gap-1">
            {z.pincodes.slice(0, 8).map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>
            ))}
            {z.pincodes.length > 8 && (
              <span className="text-xs text-muted-foreground">+{z.pincodes.length - 8}</span>
            )}
            {z.pincodes.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
          </div>
        ),
      },
      {
        key: 'count',
        header: 'Count',
        render: (z) => z.pincodes.length,
      },
      {
        key: 'status',
        header: 'Status',
        render: (z) => (
          <Badge variant={z.active ? 'default' : 'outline'}>{z.active ? 'Active' : 'Inactive'}</Badge>
        ),
      },
      ...(canManage
        ? [
            {
              key: 'actions',
              header: 'Actions',
              render: (z: ServiceZone) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`${orgPath('/admin/service-zones')}/${z.id}?tab=edit`);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleActive(z);
                    }}
                  >
                    {z.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(z);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage, handleDelete, navigate, toggleActive],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Service zones"
          description="The org operates by city + pincode. These zones are the single source of truth for booking validation and city-wise filtering across the platform. Super Admin controlled."
        />
        {canManage && (
          <Button onClick={() => navigate(`${orgPath('/admin/service-zones')}/new?tab=edit`)}>
            <FiPlus className="mr-2 h-4 w-4" />
            Add service zone
          </Button>
        )}
      </div>

      {(error || actionError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError ?? error}
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search city, state, or pincode…"
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <FilterField label="Status" htmlFor="zone-filter-status">
          <select
            id="zone-filter-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draftFilters.status}
            onChange={(e) => setDraftFilter('status', e.target.value as '' | 'active' | 'inactive')}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FilterField>
      </ListToolbar>

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No service zones configured yet."
        getRowKey={(z) => z.id}
        onRowClick={(z) => navigate(`${orgPath('/admin/service-zones')}/${z.id}?tab=view`)}
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

      {!canManage && (
        <Card>
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <FiMapPin className="h-4 w-4" />
            Service zones are managed by Super Admin. You can view current coverage here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
