import type { IPaymentService } from './types';
import type { PaymentLink, PaymentOrder, PaymentResult } from '@/types/payment';

const paymentOrders = new Map<string, PaymentOrder>();
const paymentLinks = new Map<string, PaymentLink>();
const orderPaymentStatus = new Map<string, string>();

export class DummyPaymentService implements IPaymentService {
  async createOrder(orderId: string, amount: number): Promise<PaymentOrder> {
    const order: PaymentOrder = {
      id: `pay-${Date.now()}`,
      orderId,
      providerOrderId: `order_mock_${orderId.slice(0, 8)}`,
      amount,
      currency: 'INR',
      status: 'created',
      createdAt: new Date().toISOString(),
    };
    paymentOrders.set(order.id, order);
    orderPaymentStatus.set(orderId, 'processing');
    return order;
  }

  async createPaymentLink(
    orderId: string,
    patientId: string,
    amount: number,
    channels: ('whatsapp' | 'sms' | 'email')[],
  ): Promise<PaymentLink> {
    const link: PaymentLink = {
      id: `plink-${Date.now()}`,
      orderId,
      patientId,
      amount,
      status: 'active',
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      sentVia: channels,
      url: `https://pay.livotale.demo/checkout/${orderId}`,
      createdAt: new Date().toISOString(),
    };
    paymentLinks.set(link.id, link);
    orderPaymentStatus.set(orderId, 'link_sent');
    return link;
  }

  async simulateSuccess(paymentId: string): Promise<PaymentResult> {
    const order = paymentOrders.get(paymentId);
    const orderId = order?.orderId ?? paymentId;
    if (order) order.status = 'success';
    orderPaymentStatus.set(orderId, 'success');
    return {
      paymentId,
      orderId,
      status: 'success',
      providerPaymentId: `mock_txn_${Date.now()}`,
      amount: order?.amount ?? 0,
      paidAt: new Date().toISOString(),
    };
  }

  async simulateFailure(paymentId: string): Promise<PaymentResult> {
    const order = paymentOrders.get(paymentId);
    const orderId = order?.orderId ?? paymentId;
    if (order) order.status = 'failed';
    orderPaymentStatus.set(orderId, 'failed');
    return {
      paymentId,
      orderId,
      status: 'failed',
      providerPaymentId: `mock_fail_${Date.now()}`,
      amount: order?.amount ?? 0,
    };
  }

  async getPaymentStatus(orderId: string): Promise<string> {
    return orderPaymentStatus.get(orderId) ?? 'pending';
  }
}

export const dummyPaymentService = new DummyPaymentService();
