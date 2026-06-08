import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import {
  DEMO_OPERATIONS_OVERVIEW,
  DEMO_SERVICE_ORDERS,
  demoCollectPayment,
} from './adminOperations.mock';
import type {
  CollectPaymentResult,
  DemoPayResult,
  DemoPayMethod,
  OperationsOverview,
  PaymentCollectMethod,
  ServiceOrder,
  ServiceOrderType,
} from '@/types/adminOperations';

class AdminOperationsService extends BaseApiService {
  async getOverview(): Promise<OperationsOverview> {
    return mockOrApi(
      () => DEMO_OPERATIONS_OVERVIEW,
      () => this.get<OperationsOverview>('/admin/operations/overview'),
    );
  }

  async listOrders(params?: {
    paymentStatus?: string;
    orderType?: ServiceOrderType;
    search?: string;
  }): Promise<ServiceOrder[]> {
    return mockOrApi(
      () => {
        let rows = [...DEMO_SERVICE_ORDERS];
        if (params?.paymentStatus) {
          rows = rows.filter((r) => r.paymentStatus === params.paymentStatus);
        }
        if (params?.orderType) {
          rows = rows.filter((r) => r.orderType === params.orderType);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          rows = rows.filter(
            (r) =>
              r.orderNumber.toLowerCase().includes(q) ||
              r.patientName.toLowerCase().includes(q),
          );
        }
        return rows;
      },
      () => this.get<ServiceOrder[]>('/admin/operations/orders', { params }),
    );
  }

  async collectPayment(
    orderId: string,
    body: { orderType: ServiceOrderType; method: PaymentCollectMethod; amount: number; notes?: string },
  ): Promise<CollectPaymentResult> {
    return mockOrApi(
      () => {
        const updated = demoCollectPayment(orderId, body.method);
        if (!updated) throw new Error('Order not found');
        return { ...updated, collectedMethod: body.method };
      },
      () => this.post<CollectPaymentResult>(`/admin/operations/orders/${orderId}/collect`, body),
    );
  }

  async patientDemoPay(appointmentId: string, method: DemoPayMethod = 'upi'): Promise<DemoPayResult> {
    return mockOrApi(
      () => ({
        appointmentId,
        paymentStatus: 'paid',
        providerPaymentId: `mock-txn-${Date.now()}`,
        amount: 800,
      }),
      () => this.post<DemoPayResult>(`/patient/appointments/${appointmentId}/demo-pay`, { method }),
    );
  }
}

export const adminOperationsService = new AdminOperationsService();
