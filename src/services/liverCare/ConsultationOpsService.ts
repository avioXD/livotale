import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { ConsultationQueueRow } from '@/types/consultationQueue';
import { MOCK_PACKAGES, MOCK_LIVER_ORDERS } from './liverCare.mock';
import { getLatestPrescriptionForOrder, MOCK_PRESCRIPTIONS } from './consultation.mock';
import {
  buildConsultationQueueRow,
  buildConsultationQueueRows,
  consultationPackageIdSet,
  filterConsultationQueueRows,
  type ConsultationQueueFilters,
} from './consultation.queue';

class ConsultationOpsService extends BaseApiService {
  async listConsultationQueue(filters?: ConsultationQueueFilters): Promise<ConsultationQueueRow[]> {
    return mockOrApi(
      () => {
        const rows = buildConsultationQueueRows(
          MOCK_LIVER_ORDERS,
          consultationPackageIdSet(MOCK_PACKAGES),
          MOCK_PRESCRIPTIONS,
        );
        return filterConsultationQueueRows(rows, {
          search: filters?.search?.toLowerCase(),
          orderStatus: filters?.orderStatus,
          stage: filters?.stage,
        });
      },
      () =>
        this.get<ConsultationQueueRow[]>('/admin/consultations/queue', {
          params: {
            search: filters?.search,
            orderStatus: filters?.orderStatus,
            stage: filters?.stage,
          },
        }),
    );
  }

  async getConsultationQueueRow(orderId: string): Promise<ConsultationQueueRow | null> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) return null;
        const pkgIds = consultationPackageIdSet(MOCK_PACKAGES);
        if (!pkgIds.has(order.packageId)) return null;
        return buildConsultationQueueRow(order, getLatestPrescriptionForOrder(orderId));
      },
      () => this.get<ConsultationQueueRow>(`/admin/consultations/queue/${orderId}`),
    );
  }
}

export const consultationOpsService = new ConsultationOpsService();
