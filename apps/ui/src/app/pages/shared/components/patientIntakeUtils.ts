import type { Enquiry } from '@/types/enquiry';
import { EMPTY_COMORBIDITIES, type PatientSex, type ScanPatientIntakeInput } from '@/types/scanPatientIntake';
import type { LiverCareOrder } from '@/types/serviceOrder';

function sexFromGender(gender?: string | null): PatientSex {
  if (!gender) return 'female';
  const key = gender.trim().toLowerCase();
  if (key === 'male' || key === 'm') return 'male';
  if (key === 'female' || key === 'f') return 'female';
  return 'other';
}

export function patientIntakeFromEnquiry(enquiry: Enquiry): ScanPatientIntakeInput {
  return {
    name: enquiry.patientName,
    sex: sexFromGender(enquiry.gender),
    age: enquiry.age && enquiry.age > 0 ? enquiry.age : 0,
    phone: enquiry.phone,
    weightKg: null,
    heightMeters: null,
    comorbidities: { ...EMPTY_COMORBIDITIES },
  };
}

export function patientIntakeFromOrder(order: LiverCareOrder): ScanPatientIntakeInput {
  return {
    name: order.patientName,
    sex: 'female',
    age: 0,
    phone: order.patientPhone,
    weightKg: null,
    heightMeters: null,
    comorbidities: { ...EMPTY_COMORBIDITIES },
  };
}

export const EMPTY_ORDER_INTAKE: ScanPatientIntakeInput = {
  name: '',
  sex: 'female',
  age: 0,
  phone: '',
  weightKg: null,
  heightMeters: null,
  comorbidities: { ...EMPTY_COMORBIDITIES },
};
