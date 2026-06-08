import type { SampleCollection, SampleLabTest, SampleCollectionAnalytics } from '@/types/sampleCollection';

export const DEMO_TESTS: SampleLabTest[] = [
  { orderItemId: 't1', labTestId: 'lt1', code: 'SGPT', name: 'Alanine aminotransferase / SGPT', category: 'lft', unit: 'U/L', normalMin: 0, normalMax: 40, referenceRange: '0 - 40 U/L', resultValue: null, resultText: null, flag: 'unknown', resultedAt: null },
  { orderItemId: 't2', labTestId: 'lt2', code: 'SGOT', name: 'Aspartate aminotransferase / SGOT', category: 'lft', unit: 'U/L', normalMin: 0, normalMax: 40, referenceRange: '0 - 40 U/L', resultValue: null, resultText: null, flag: 'unknown', resultedAt: null },
  { orderItemId: 't3', labTestId: 'lt3', code: 'GGT', name: 'Gamma-glutamyl transferase', category: 'lft', unit: 'U/L', normalMin: 0, normalMax: 55, referenceRange: '0 - 55 U/L', resultValue: null, resultText: null, flag: 'unknown', resultedAt: null },
  { orderItemId: 't4', labTestId: 'lt4', code: 'TG', name: 'Triglycerides', category: 'lipid', unit: 'mg/dL', normalMin: null, normalMax: 150, referenceRange: '< 150 mg/dL', resultValue: null, resultText: null, flag: 'unknown', resultedAt: null },
];

export function sample(partial: Partial<SampleCollection> & Pick<SampleCollection, 'id' | 'sampleCode' | 'status' | 'patientName'>): SampleCollection {
  return {
    appointmentId: partial.appointmentId ?? `appt-${partial.id}`,
    patientId: partial.patientId ?? 'patient-demo',
    patientCode: partial.patientCode ?? 'MR-21847',
    collectionType: 'home',
    technicianId: 'tech-vinod',
    technicianName: 'Vinod K.',
    labPartnerId: 'lab-mock',
    labOrderId: `order-${partial.id}`,
    qrVerificationCode: partial.qrVerificationCode ?? `demo-qr-${partial.sampleCode.slice(-4)}`,
    pincode: '400013',
    priority: 'normal',
    sampleType: 'blood',
    tubesCount: 3,
    containerType: 'EDTA',
    fastingStatus: 'fasting',
    collectionRemarks: null,
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 3600000).toISOString(),
    typeName: 'Blood sample collection',
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    collectedAt: new Date(Date.now() - 7200000).toISOString(),
    handedOverAt: new Date(Date.now() - 3600000).toISOString(),
    receivedAt: partial.status === 'handed_over_to_lab' ? null : new Date(Date.now() - 1800000).toISOString(),
    reportPublishedAt: null,
    requestedTests: partial.requestedTests ?? DEMO_TESTS,
    requestedTestCount: partial.requestedTests?.length ?? DEMO_TESTS.length,
    photos: partial.photos ?? [],
    ...partial,
  };
}

export const LAB_DEMO_SAMPLES: SampleCollection[] = [
  sample({
    id: 'demo-sc-08',
    sampleCode: 'LGSC-DEMO-000008',
    status: 'handed_over_to_lab',
    patientName: 'Rohan Mehta',
    patientCode: 'MR-21847',
    technicianName: 'Vinod K.',
    photos: [{ id: 'p1', fileId: 'f1', photoType: 'container_label', createdAt: new Date().toISOString(), storageUrl: 'https://picsum.photos/seed/lgsc8/640/480' }],
  }),
  sample({
    id: 'demo-sc-09',
    sampleCode: 'LGSC-DEMO-000009',
    status: 'received_by_lab',
    patientName: 'Priya Nair',
    patientCode: 'MR-21848',
    technicianName: 'Vinod K.',
    photos: [{ id: 'p2', fileId: 'f2', photoType: 'container_qr', createdAt: new Date().toISOString(), storageUrl: 'https://picsum.photos/seed/lgsc9/640/480' }],
  }),
  sample({
    id: 'demo-sc-10',
    sampleCode: 'LGSC-DEMO-000010',
    status: 'testing_in_progress',
    patientName: 'Amit Shah',
    patientCode: 'MR-21849',
    technicianName: 'Rajesh P.',
    requestedTests: DEMO_TESTS.map((t, i) =>
      i < 2 ? { ...t, resultValue: i === 0 ? 52 : 44, flag: 'high' as const, resultedAt: new Date().toISOString() } : t,
    ),
  }),
  sample({
    id: 'demo-sc-11',
    sampleCode: 'LGSC-DEMO-000011',
    status: 'pending_approval',
    patientName: 'Sneha Rao',
    patientCode: 'MR-21850',
    technicianName: 'Vinod K.',
    requestedTests: DEMO_TESTS.map((t) => ({ ...t, resultValue: 38, flag: 'normal' as const, resultedAt: new Date().toISOString() })),
    reports: [{ id: 'r1', reportCode: 'LAB-DEMO-0011', reportDate: new Date().toISOString().slice(0, 10), verified: false, approvalStatus: 'pending', approvalStage: 'admin', createdAt: new Date().toISOString() }],
  }),
];

export function getLabDemoSampleById(id: string): SampleCollection | null {
  return LAB_DEMO_SAMPLES.find((s) => s.id === id) ?? null;
}

export const LAB_DEMO_ANALYTICS: SampleCollectionAnalytics = {
  period: 'monthly',
  summary: {
    total_samples: 24,
    collected: 22,
    in_lab_pipeline: 14,
    reports_published: 8,
    rejected: 1,
  },
  collectionsOverTime: [
    { bucket: new Date(Date.now() - 120 * 86400000).toISOString(), collected: 3 },
    { bucket: new Date(Date.now() - 90 * 86400000).toISOString(), collected: 5 },
    { bucket: new Date(Date.now() - 60 * 86400000).toISOString(), collected: 4 },
    { bucket: new Date(Date.now() - 30 * 86400000).toISOString(), collected: 6 },
    { bucket: new Date().toISOString(), collected: 4 },
  ],
  reportsOverTime: [
    { bucket: new Date(Date.now() - 90 * 86400000).toISOString(), reports: 2 },
    { bucket: new Date(Date.now() - 60 * 86400000).toISOString(), reports: 3 },
    { bucket: new Date(Date.now() - 30 * 86400000).toISOString(), reports: 2 },
    { bucket: new Date().toISOString(), reports: 1 },
  ],
  byStatus: [
    { status: 'completed', total: 8 },
    { status: 'testing_in_progress', total: 4 },
    { status: 'received_by_lab', total: 3 },
    { status: 'handed_over_to_lab', total: 2 },
  ],
};

