import type { OperationsOverview, ServiceOrder } from '@/types/adminOperations';

export const DEMO_OPERATIONS_OVERVIEW: OperationsOverview = {
  appointmentsToday: 14,
  pendingAssignments: 3,
  missedToday: 2,
  samplesPendingAssign: 4,
  unpaidOrders: 5,
  collectedToday: 24600,
};

export const DEMO_SERVICE_ORDERS: ServiceOrder[] = [
  {
    id: 'demo-order-1',
    orderType: 'appointment',
    orderNumber: 'LG-OPS-DOC-001',
    patientId: 'demo-patient-1',
    patientName: 'Rohan Mehta',
    serviceLabel: 'Doctor consultation',
    amount: 800,
    paymentStatus: 'pending',
    placedAt: new Date().toISOString(),
    referenceId: 'demo-order-1',
    appointmentStatus: 'pending_payment',
  },
  {
    id: 'demo-order-2',
    orderType: 'appointment',
    orderNumber: 'LG-OPS-WALK-001',
    patientId: 'demo-patient-2',
    patientName: 'Anita Shah',
    serviceLabel: 'Home sample collection',
    amount: 1200,
    paymentStatus: 'unpaid',
    placedAt: new Date(Date.now() - 3600000).toISOString(),
    referenceId: 'demo-order-2',
    appointmentStatus: 'booked',
  },
  {
    id: 'demo-order-3',
    orderType: 'pharmacy',
    orderNumber: 'LG-OPS-RX-001',
    patientId: 'demo-patient-1',
    patientName: 'Rohan Mehta',
    serviceLabel: 'Pharmacy order',
    amount: 890,
    paymentStatus: 'created',
    placedAt: new Date(Date.now() - 7200000).toISOString(),
    referenceId: 'demo-order-3',
  },
  {
    id: 'demo-order-4',
    orderType: 'appointment',
    orderNumber: 'LGSC-DEMO-000001',
    patientId: 'demo-patient-3',
    patientName: 'Vikram Patel',
    serviceLabel: 'Home sample collection',
    amount: 1500,
    paymentStatus: 'pending',
    placedAt: new Date(Date.now() - 86400000).toISOString(),
    referenceId: 'demo-order-4',
    appointmentStatus: 'booked',
  },
];

export function demoCollectPayment(
  orderId: string,
  method: string,
): (ServiceOrder & { collectedMethod?: string }) | null {
  const idx = DEMO_SERVICE_ORDERS.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  DEMO_SERVICE_ORDERS[idx] = { ...DEMO_SERVICE_ORDERS[idx], paymentStatus: 'paid' };
  return { ...DEMO_SERVICE_ORDERS[idx], collectedMethod: method };
}
