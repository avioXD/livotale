import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { PatientFiltersPanel } from '@/app/pages/patients/components/PatientFiltersPanel';
import { patientColumns } from '@/app/pages/patients/components/patientColumns';
import { usePatientsStore, useAuthStore, useUserRole } from '@/store';
import { AppRole, DEFAULT_PATIENT_FILTERS } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { countActiveFilters } from '@/utils/listFilters';

export function PatientsPage() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isDoctor = userRole === AppRole.DOCTOR;
  const isZoneScopedUser =
    !userRoles.includes(AppRole.SUPER_ADMIN) &&
    (userRoles.includes(AppRole.OPERATIONS) || userRoles.includes(AppRole.CITY_MANAGER));
  const emptyMessage = isZoneScopedUser
    ? 'No patients in your service zone. Adjust filters if you applied any.'
    : 'No patients found. Adjust filters or connect the API.';
  const {
    items,
    total,
    totalPages,
    page,
    pageSize,
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
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
  } = usePatientsStore(
    useShallow((s) => ({
      items: s.items,
      total: s.total,
      totalPages: s.totalPages,
      page: s.page,
      pageSize: s.pageSize,
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedSearch: s.appliedSearch,
      appliedFilters: s.appliedFilters,
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

  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_PATIENT_FILTERS,
    appliedSearch,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={
          isDoctor
            ? 'Search and open patient records — demographics, history, orders, and care journey.'
            : 'Manage patient records, home visit schedules, and care journeys.'
        }
        actions={
          !isDoctor ? (
            <Button size="sm" asChild>
              <Link to={orgPath('/admin/appointments/book')}>Book appointment</Link>
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <p className="mt-1 text-xs opacity-80">
            Connect backend at VITE_API_BASE_URL to load live data.
          </p>
        </div>
      )}

      <ListToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search patients (debounced)..."
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        isLoading={isLoading}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      >
        <PatientFiltersPanel filters={draftFilters} onFilterChange={setDraftFilter} />
      </ListToolbar>

      <DataTable
        columns={patientColumns}
        data={items}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        getRowKey={(p) => p.id}
        onRowClick={(p) => navigate(orgPath(`/patients/${p.id}?tab=profile`))}
      />

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
