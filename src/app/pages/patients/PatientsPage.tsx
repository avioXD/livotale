import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  ListToolbar,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { PatientFiltersPanel } from '@/app/pages/patients/components/PatientFiltersPanel';
import { patientColumns } from '@/app/pages/patients/components/patientColumns';
import { usePatientsStore } from '@/store';

export function PatientsPage() {
  const {
    items,
    total,
    totalPages,
    page,
    pageSize,
    searchInput,
    draftFilters,
    isLoading,
    error,
    fetchItems,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
  } = usePatientsStore();

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Manage patient records, home visit schedules, and care journeys."
        actions={
          <Button size="sm" asChild>
            <Link to="/admin/appointments/book">Book appointment</Link>
          </Button>
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
      >
        <PatientFiltersPanel filters={draftFilters} onFilterChange={setDraftFilter} />
      </ListToolbar>

      <DataTable
        columns={patientColumns}
        data={items}
        isLoading={isLoading}
        emptyMessage="No patients found. Adjust filters or connect the API."
        getRowKey={(p) => p.id}
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
