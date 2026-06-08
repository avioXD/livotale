import type { FibrosisScanRecord, TechnicianOrderVisit } from '@/types/fibrosisScan';

export const MOCK_TECHNICIAN_ID = 'tech-1';

export interface AssignableTechnician {
  id: string;
  name: string;
  zone: string;
  status: 'available' | 'on_visit' | 'off_duty';
}

export const MOCK_ASSIGNABLE_TECHNICIANS: AssignableTechnician[] = [
  { id: 'tech-1', name: 'Demo Technician', zone: 'Mumbai', status: 'available' },
  { id: 'tech-2', name: 'Ravi Sharma', zone: 'Pune', status: 'on_visit' },
  { id: 'tech-3', name: 'Anita Desai', zone: 'Bangalore', status: 'available' },
];

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();

export const MOCK_TECH_VISITS: Record<string, TechnicianOrderVisit> = {
  'lco-1': {
    orderId: 'lco-1',
    technicianId: MOCK_TECHNICIAN_ID,
    visitStep: 'scan_completed',
    address: 'Koregaon Park, Pune',
    city: 'Pune',
    pincode: '411001',
    visitStartedAt: days(2),
    reachedAt: days(2),
    completedAt: days(1),
  },
  'lco-2': {
    orderId: 'lco-2',
    technicianId: MOCK_TECHNICIAN_ID,
    visitStep: 'scan_completed',
    address: 'Bandra West, Mumbai',
    city: 'Mumbai',
    pincode: '400050',
    visitStartedAt: days(4),
    reachedAt: days(4),
    completedAt: days(3),
  },
  'lco-3': {
    orderId: 'lco-3',
    technicianId: MOCK_TECHNICIAN_ID,
    visitStep: 'scan_completed',
    address: 'Indiranagar, Bangalore',
    city: 'Bangalore',
    pincode: '560038',
    visitStartedAt: days(6),
    reachedAt: days(6),
    completedAt: days(5),
  },
  'lco-5': {
    orderId: 'lco-5',
    technicianId: MOCK_TECHNICIAN_ID,
    visitStep: 'assigned',
    address: 'Andheri East, Mumbai',
    city: 'Mumbai',
    pincode: '400069',
    patientEmail: 'meera.kapoor@example.com',
  },
};

export const MOCK_FIBROSIS_SCANS: Record<string, FibrosisScanRecord> = {
  'lco-1': {
    id: 'scan-lco-1',
    orderId: 'lco-1',
    patientId: 'demo-patient-2',
    liverStiffnessKpa: 6.8,
    capDbm: 245,
    iqr: 0.9,
    iqrMedianPercent: 22,
    validMeasurements: 9,
    totalMeasurements: 10,
    successRatePercent: 90,
    probeType: 'M',
    scanAt: days(1),
    operatorName: 'Vinod K.',
    deviceSerial: 'FS-DEMO-001',
    fastingStatus: true,
    bmi: 26.2,
    interpretation: 'Mild fibrosis',
    steatosisGrade: 'S1',
    fibrosisStage: 'F1',
    remarks: 'Patient cooperative, good scan quality.',
    source: 'device',
    locked: false,
    createdAt: days(1),
    updatedAt: days(1),
  },
  'lco-2': {
    id: 'scan-lco-2',
    orderId: 'lco-2',
    patientId: 'demo-patient-3',
    liverStiffnessKpa: 9.2,
    capDbm: 310,
    iqr: 1.1,
    iqrMedianPercent: 28,
    validMeasurements: 8,
    totalMeasurements: 10,
    successRatePercent: 80,
    probeType: 'XL',
    scanAt: days(3),
    operatorName: 'Vinod K.',
    deviceSerial: 'FS-DEMO-001',
    fastingStatus: true,
    bmi: 29.1,
    interpretation: 'Moderate fibrosis',
    steatosisGrade: 'S2',
    fibrosisStage: 'F2',
    source: 'manual',
    locked: false,
    createdAt: days(3),
    updatedAt: days(3),
  },
  'lco-3': {
    id: 'scan-lco-3',
    orderId: 'lco-3',
    patientId: 'demo-patient-1',
    liverStiffnessKpa: 7.4,
    capDbm: 268,
    iqr: 1.0,
    iqrMedianPercent: 24,
    validMeasurements: 10,
    totalMeasurements: 10,
    successRatePercent: 100,
    probeType: 'M',
    scanAt: days(5),
    operatorName: 'Vinod K.',
    deviceSerial: 'FS-DEMO-001',
    fastingStatus: true,
    bmi: 27.5,
    interpretation: 'Mild to moderate fibrosis',
    steatosisGrade: 'S1',
    fibrosisStage: 'F1–F2',
    remarks: 'Good quality scan. Recommend specialist review.',
    source: 'device',
    locked: true,
    createdAt: days(5),
    updatedAt: days(5),
  },
};
