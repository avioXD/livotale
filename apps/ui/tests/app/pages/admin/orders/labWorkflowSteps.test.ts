import { getLabWorkflowSteps } from '@/app/pages/admin/orders/components/labWorkflowSteps';
import type { LiverCareOrder } from '@/types/serviceOrder';

function baseOrder(overrides: Partial<LiverCareOrder> = {}): LiverCareOrder {
  return {
    id: 'order-1',
    orderNumber: 'LC-20260002',
    patientName: 'Test Patient',
    packageCode: 'PKG-2',
    orderStatus: 'pathology_pending',
    paymentStatus: 'success',
    ...overrides,
  } as LiverCareOrder;
}

describe('getLabWorkflowSteps', () => {
  it('marks schedule confirmed before portal order mapping', () => {
    const steps = getLabWorkflowSteps({
      order: baseOrder({
        partnerLabId: 'lab-1',
        pathologyScheduledAt: '2026-06-25T10:00:00.000Z',
      }),
      dispatch: null,
      report: null,
      aiJob: null,
    });

    expect(steps[0].state).toBe('done');
    expect(steps[1].state).toBe('done');
    expect(steps[2].state).toBe('current');
    expect(steps[2].label).toContain('portal order ID');
  });
});
