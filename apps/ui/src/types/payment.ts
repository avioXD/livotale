export type OfflinePaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card';

export interface OfflinePaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  method: OfflinePaymentMethod;
  transactionRef?: string | null;
  paidAt: string;
  collectedBy: string;
  receiptFileId?: string | null;
  remarks?: string | null;
}

export interface PaymentLink {
  id: string;
  orderId: string;
  patientId: string;
  amount: number;
  status: 'active' | 'expired' | 'paid' | 'cancelled';
  expiresAt: string;
  sentVia: ('whatsapp' | 'sms' | 'email')[];
  url: string;
  createdAt: string;
}

export interface PaymentOrder {
  id: string;
  orderId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'processing' | 'success' | 'failed';
  createdAt: string;
}

export interface PaymentResult {
  paymentId: string;
  orderId: string;
  status: 'success' | 'failed';
  providerPaymentId: string;
  amount: number;
  paidAt?: string;
}
