import { createListStore } from '@/store/createListStore';
import { patientsService } from '@/services/patients';
import { DEFAULT_PATIENT_FILTERS } from '@/types';
import type { Patient, PatientFilters } from '@/types';

export const usePatientsStore = createListStore<Patient, PatientFilters>({
  name: 'patients',
  defaultFilters: DEFAULT_PATIENT_FILTERS,
  fetchFn: (params) => patientsService.list(params),
});
