export type OperationsTab = 'overview' | 'appointments' | 'samples' | 'orders';

export type ServiceOrderType = 'appointment' | 'pharmacy';

export type PaymentCollectMethod = 'cash' | 'online' | 'qr';

export type DemoPayMethod = 'upi' | 'card';

export interface OperationsOverview {
  appointmentsToday: number;
  pendingAssignments: number;
  missedToday: number;
  samplesPendingAssign: number;
  unpaidOrders: number;
  collectedToday: number;
}

export interface ServiceOrder {
  id: string;
  orderType: ServiceOrderType;
  orderNumber: string;
  patientId: string;
  patientName: string;
  serviceLabel: string;
  amount: number;
  paymentStatus: string;
  placedAt: string;
  referenceId: string;
  appointmentStatus?: string | null;
}

export interface CollectPaymentResult extends ServiceOrder {
  paymentId?: string;
  collectedMethod?: PaymentCollectMethod;
}

export interface DemoPayResult {
  appointmentId: string;
  paymentStatus: string;
  providerPaymentId: string;
  amount: number;
}
