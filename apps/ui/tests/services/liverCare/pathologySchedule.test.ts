import {
  canOpsConfirmPathologySchedule,
  getPathologySchedulePrerequisites,
  isPortalOrderMapped,
} from '@/services/liverCare/pathologySchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';

function baseOrder(overrides: Partial<LiverCareOrder> = {}): LiverCareOrder {
  return {
    id: 'order-1',
    orderNumber: 'LC-20260002',
    patientName: 'Test Patient',
    packageCode: 'PKG-2',
    orderStatus: 'pathology_pending',
    paymentStatus: 'success',
    partnerLabId: 'lab-1',
    partnerLabName: 'Kolkata Lab Partner',
    pathologyPatientPreferredAt: '2026-06-25T10:00:00.000Z',
    ...overrides,
  } as LiverCareOrder;
}

describe('getPathologySchedulePrerequisites', () => {
  it('does not require portal order mapping before schedule confirmation', () => {
    const prereqs = getPathologySchedulePrerequisites(baseOrder());
    const lab = prereqs.find((p) => p.id === 'lab');
    expect(lab?.met).toBe(true);
    expect(lab?.label).toContain('Lab partner assigned');
    expect(canOpsConfirmPathologySchedule(baseOrder())).toBe(true);
  });

  it('blocks schedule when payment is pending', () => {
    const order = baseOrder({ paymentStatus: 'pending' });
    expect(canOpsConfirmPathologySchedule(order)).toBe(false);
  });
});

describe('isPortalOrderMapped', () => {
  it('returns true when internal ref and portal ID are saved', () => {
    expect(
      isPortalOrderMapped(
        baseOrder({
          pathologyLabOrderRef: 'LAB-20260002-810E',
          pathologyExternalAppointmentId: 'DR12345',
        }),
      ),
    ).toBe(true);
  });

  it('returns false when only internal ref exists', () => {
    expect(
      isPortalOrderMapped(
        baseOrder({
          pathologyLabOrderRef: 'LAB-20260002-810E',
        }),
      ),
    ).toBe(false);
  });
});
