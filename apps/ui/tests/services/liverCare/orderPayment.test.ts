import { isPaymentReadyForPathology } from '@/services/liverCare/pathologySchedule';
import { isPaymentReadyForScan } from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';

function order(paymentStatus: LiverCareOrder['paymentStatus']): LiverCareOrder {
  return {
    id: 'order-1',
    orderNumber: 'LT-001',
    patientId: 'p1',
    patientName: 'Test',
    patientPhone: '9876543210',
    packageId: 'pkg',
    packageCode: 'PKG-1',
    packageName: 'Basic',
    packagePrice: 1000,
    discount: 0,
    finalAmount: 1000,
    paymentMode: null,
    paymentStatus,
    orderStatus: 'payment_pending',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('order payment readiness', () => {
  it('allows scan and pathology only after verified success', () => {
    expect(isPaymentReadyForScan(order('pending'))).toBe(false);
    expect(isPaymentReadyForScan(order('processing'))).toBe(false);
    expect(isPaymentReadyForScan(order('success'))).toBe(true);

    expect(isPaymentReadyForPathology(order('processing'))).toBe(false);
    expect(isPaymentReadyForPathology(order('success'))).toBe(true);
  });
});
