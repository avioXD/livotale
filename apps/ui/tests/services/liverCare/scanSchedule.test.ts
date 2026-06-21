import {
  canOpsConfirmScanSchedule,
  getScanSchedulePrerequisites,
  isPaymentReadyForScan,
} from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';

function baseOrder(overrides: Partial<LiverCareOrder> = {}): LiverCareOrder {
  return {
    id: 'order-1',
    orderNumber: 'LC-20260001',
    patientId: 'patient-1',
    patientName: 'Test Patient',
    patientPhone: '9876543210',
    packageId: 'pkg-1',
    packageCode: 'PKG-1',
    packageName: 'FibroScan',
    packagePrice: 5000,
    discount: 0,
    finalAmount: 5000,
    paymentMode: 'offline',
    paymentStatus: 'success',
    orderStatus: 'payment_completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getScanSchedulePrerequisites', () => {
  it('marks address prerequisite unmet when hasAddress is false', () => {
    const prereqs = getScanSchedulePrerequisites(baseOrder(), { hasAddress: false });
    const address = prereqs.find((p) => p.id === 'address');
    expect(address?.met).toBe(false);
    expect(canOpsConfirmScanSchedule(baseOrder(), { hasAddress: false })).toBe(false);
  });

  it('marks address prerequisite met when hasAddress is true', () => {
    const order = baseOrder({
      scanPatientPreferredAt: '2026-06-25T10:00:00.000Z',
      technicianId: 'tech-1',
      visitLocation: {
        address: '42 Park Street',
        city: 'Kolkata',
        pincode: '700016',
        source: 'patient_address',
        isComplete: true,
      },
    });
    const prereqs = getScanSchedulePrerequisites(order, { hasAddress: true });
    const address = prereqs.find((p) => p.id === 'address');
    expect(address?.met).toBe(true);
    expect(canOpsConfirmScanSchedule(order, { hasAddress: true })).toBe(true);
  });
});

describe('isPaymentReadyForScan', () => {
  it('returns true only for success payment status', () => {
    expect(isPaymentReadyForScan(baseOrder({ paymentStatus: 'success' }))).toBe(true);
    expect(isPaymentReadyForScan(baseOrder({ paymentStatus: 'processing' }))).toBe(false);
  });
});
