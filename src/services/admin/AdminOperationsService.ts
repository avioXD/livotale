import { BaseApiService } from '@/services/base';
import { isApiUnavailableError } from '@/data/labSampleDemoData';
import {
  DEMO_OPERATIONS_OVERVIEW,
  DEMO_SERVICE_ORDERS,
  demoCollectPayment,
} from '@/data/adminOperationsDemoData';
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
    try {
      return await this.get<OperationsOverview>('/admin/operations/overview');
    } catch (err) {
      if (isApiUnavailableError(err)) return DEMO_OPERATIONS_OVERVIEW;
      return DEMO_OPERATIONS_OVERVIEW;
    }
  }

  async listOrders(params?: {
    paymentStatus?: string;
    orderType?: ServiceOrderType;
    search?: string;
  }): Promise<ServiceOrder[]> {
    try {
      return await this.get<ServiceOrder[]>('/admin/operations/orders', { params });
    } catch {
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
    }
  }

  async collectPayment(
    orderId: string,
    body: { orderType: ServiceOrderType; method: PaymentCollectMethod; amount: number; notes?: string },
  ): Promise<CollectPaymentResult> {
    try {
      return await this.post<CollectPaymentResult>(`/admin/operations/orders/${orderId}/collect`, body);
    } catch {
      const updated = demoCollectPayment(orderId, body.method);
      if (!updated) throw new Error('Order not found');
      return { ...updated, collectedMethod: body.method };
    }
  }

  async patientDemoPay(appointmentId: string, method: DemoPayMethod = 'upi'): Promise<DemoPayResult> {
    return this.post<DemoPayResult>(`/patient/appointments/${appointmentId}/demo-pay`, { method });
  }
}

export const adminOperationsService = new AdminOperationsService();
