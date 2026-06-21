import { BaseApiService } from '@/services/base';
import type {
  CollectPaymentResult,
  OperationsOverview,
  PaymentCollectMethod,
  ServiceOrder,
  ServiceOrderType,
} from '@/types/adminOperations';

class AdminOperationsService extends BaseApiService {
  async getOverview(): Promise<OperationsOverview> {
    return this.get<OperationsOverview>('/admin/operations/overview')
  }

  async listOrders(params?: {
    paymentStatus?: string;
    orderType?: ServiceOrderType;
    search?: string;
  }): Promise<ServiceOrder[]> {
    return this.get<ServiceOrder[]>('/admin/operations/orders', { params })
  }

  async collectPayment(
    orderId: string,
    body: { orderType: ServiceOrderType; method: PaymentCollectMethod; amount: number; notes?: string },
  ): Promise<CollectPaymentResult> {
    return this.post<CollectPaymentResult>(`/admin/operations/orders/${orderId}/collect`, body)
  }
}

export const adminOperationsService = new AdminOperationsService();
