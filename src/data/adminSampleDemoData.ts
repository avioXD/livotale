import type {
  SampleCollection,
  SampleCollectionStatus,
  SampleCollectionTimelineEntry,
} from '@/types/sampleCollection';
import { DEMO_TESTS, sample as buildSample } from '@/data/labSampleDemoData';

const HAPPY_PATH: SampleCollectionStatus[] = [
  'sample_id_generated',
  'pending_technician_assignment',
  'assigned',
  'accepted',
  'travel_started',
  'reached_location',
  'collection_started',
  'sample_collected',
  'sample_image_uploaded',
  'pending_lab_handover',
  'handed_over_to_lab',
  'received_by_lab',
  'testing_started',
  'testing_in_progress',
  'report_uploaded',
  'pending_approval',
  'approved',
  'published_to_patient',
  'completed',
];

function buildTimeline(status: SampleCollectionStatus): SampleCollectionTimelineEntry[] {
  const idx = HAPPY_PATH.indexOf(status);
  if (idx < 0) {
    const fallbackIdx = HAPPY_PATH.indexOf('assigned');
    const slice = HAPPY_PATH.slice(0, Math.max(fallbackIdx, 1));
    return slice.map((toStatus, i) => ({
      fromStatus: i === 0 ? null : slice[i - 1],
      toStatus,
      actorRole: i < 3 ? 'admin' : 'technician',
      reason: null,
      notes: null,
      occurredAt: new Date(Date.now() - (slice.length - i) * 3600000).toISOString(),
    }));
  }

  const path = HAPPY_PATH.slice(0, idx + 1);
  return path.map((toStatus, i) => ({
    fromStatus: i === 0 ? null : path[i - 1],
    toStatus,
    actorRole:
      i < 2 ? 'admin' : i < 10 ? 'technician' : i < 14 ? 'lab_partner' : 'admin',
    reason: null,
    notes: null,
    occurredAt: new Date(Date.now() - (path.length - i) * 3600000).toISOString(),
  }));
}

type DemoRow = Partial<SampleCollection> &
  Pick<SampleCollection, 'id' | 'sampleCode' | 'status' | 'patientName'>;

const DEMO_ROWS: DemoRow[] = [
  { id: 'demo-sc-01', sampleCode: 'LGSC-DEMO-000001', status: 'pending_technician_assignment', patientName: 'Priya Shah', pincode: '400050', technicianName: null, technicianId: null },
  { id: 'demo-sc-02', sampleCode: 'LGSC-DEMO-000002', status: 'assigned', patientName: 'Priya Shah', pincode: '400013' },
  { id: 'demo-sc-03', sampleCode: 'LGSC-DEMO-000003', status: 'accepted', patientName: 'Amit Patel', pincode: '400014' },
  { id: 'demo-sc-04', sampleCode: 'LGSC-DEMO-000004', status: 'travel_started', patientName: 'Amit Patel', pincode: '400014' },
  { id: 'demo-sc-05', sampleCode: 'LGSC-DEMO-000005', status: 'reached_location', patientName: 'Sneha Rao', pincode: '400015' },
  { id: 'demo-sc-06', sampleCode: 'LGSC-DEMO-000006', status: 'collection_started', patientName: 'Sneha Rao', pincode: '400015' },
  { id: 'demo-sc-07', sampleCode: 'LGSC-DEMO-000007', status: 'sample_collected', patientName: 'Priya Shah', pincode: '400013' },
  { id: 'demo-sc-08', sampleCode: 'LGSC-DEMO-000008', status: 'handed_over_to_lab', patientName: 'Rohan Mehta', patientCode: 'MR-21847', pincode: '400014', photos: [{ id: 'p1', fileId: 'f1', photoType: 'container_label', createdAt: new Date().toISOString(), storageUrl: 'https://picsum.photos/seed/lgsc8/640/480' }] },
  { id: 'demo-sc-09', sampleCode: 'LGSC-DEMO-000009', status: 'received_by_lab', patientName: 'Priya Nair', patientCode: 'MR-21848', pincode: '400015' },
  { id: 'demo-sc-10', sampleCode: 'LGSC-DEMO-000010', status: 'testing_in_progress', patientName: 'Amit Shah', patientCode: 'MR-21849', pincode: '400015', requestedTests: DEMO_TESTS.map((t, i) => (i < 2 ? { ...t, resultValue: i === 0 ? 52 : 44, flag: 'high' as const, resultedAt: new Date().toISOString() } : t)) },
  { id: 'demo-sc-11', sampleCode: 'LGSC-DEMO-000011', status: 'pending_approval', patientName: 'Sneha Rao', patientCode: 'MR-21850', reports: [{ id: 'r1', reportCode: 'LAB-DEMO-0011', reportDate: new Date().toISOString().slice(0, 10), verified: false, approvalStatus: 'pending', approvalStage: 'admin', createdAt: new Date().toISOString() }] },
  { id: 'demo-sc-12', sampleCode: 'LGSC-DEMO-000012', status: 'completed', patientName: 'Rohan Mehta', patientCode: 'MR-21847', reportPublishedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'demo-sc-13', sampleCode: 'LGSC-DEMO-000013', status: 'rejected_by_lab', patientName: 'Amit Patel', pincode: '400014' },
  { id: 'demo-sc-14', sampleCode: 'LGSC-DEMO-000014', status: 'failed', patientName: 'Sneha Rao', pincode: '400016', technicianName: 'Meera D.' },
  { id: 'demo-sc-15', sampleCode: 'LGSC-DEMO-000015', status: 'recollection_required', patientName: 'Priya Shah', pincode: '400013' },
];

function enrich(row: DemoRow): SampleCollection {
  const base = buildSample(row);
  return {
    ...base,
    appointmentCode: row.appointmentCode ?? `APT-DEMO-${row.sampleCode.slice(-3)}`,
    appointmentStatus: row.appointmentStatus ?? 'booked',
    patientMobile: row.patientMobile ?? '+919900000101',
    line1: row.line1 ?? '12 Sample Lane, Andheri',
    cityName: row.cityName ?? 'Mumbai',
    typeName: row.typeName ?? 'Home sample collection',
    labOrderId: row.labOrderId ?? `order-${row.id}`,
    timeline: row.timeline ?? buildTimeline(row.status),
    canViewPhoto: true,
  };
}

export const ADMIN_DEMO_SAMPLES: SampleCollection[] = DEMO_ROWS.map(enrich);

export function getAdminDemoSampleById(id: string): SampleCollection | null {
  const found = ADMIN_DEMO_SAMPLES.find((s) => s.id === id);
  return found ?? null;
}

export function listAdminDemoSamples(filters: { status?: string } = {}): SampleCollection[] {
  if (!filters.status) return ADMIN_DEMO_SAMPLES;
  return ADMIN_DEMO_SAMPLES.filter((s) => s.status === filters.status);
}

export function updateAdminDemoSample(
  id: string,
  patch: Partial<SampleCollection>,
): SampleCollection | null {
  const idx = ADMIN_DEMO_SAMPLES.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  ADMIN_DEMO_SAMPLES[idx] = { ...ADMIN_DEMO_SAMPLES[idx], ...patch };
  return ADMIN_DEMO_SAMPLES[idx];
}
