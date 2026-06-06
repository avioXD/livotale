import { Input } from '@/components/ui/input';
import { FilterField } from '@/components/common';
import type { Patient, PatientFilters } from '@/types';

interface PatientFiltersPanelProps {
  filters: PatientFilters;
  onFilterChange: <K extends keyof PatientFilters>(key: K, value: PatientFilters[K]) => void;
}

export function PatientFiltersPanel({ filters, onFilterChange }: PatientFiltersPanelProps) {
  return (
    <>
      <FilterField label="Status" htmlFor="patient-status">
        <select
          id="patient-status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value as Patient['status'] | '')}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </FilterField>

      <FilterField label="Assigned Doctor" htmlFor="patient-doctor">
        <Input
          id="patient-doctor"
          value={filters.assignedDoctor}
          onChange={(e) => onFilterChange('assignedDoctor', e.target.value)}
          placeholder="Doctor name"
        />
      </FilterField>
    </>
  );
}
