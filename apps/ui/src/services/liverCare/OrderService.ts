import { BaseApiService } from '@/services/base';
import type {
  CreateOrderInput,
  LiverCareOrder,
  OrderTimelineEvent,
  ScheduleScanInput,
} from '@/types/serviceOrder';
import type { ScanTimeSlotOption, ConsultTimeSlotOption } from './SlotService';
import type { OrderWorkflowEvent } from './orderWorkflow';
import { getPaymentService } from '@/services/external';
import type { OfflinePaymentRecord } from '@/types/payment';
import type { OrderInvoice } from '@/types/patientPortal';

export interface AssignableTechnician {
  id: string;
  name: string;
  zone: string;
  status: 'available' | 'on_visit' | 'off_duty';
}

export interface AssignableDoctor {
  id: string;
  name: string;
  languages: string[];
  specialty?: string | null;
}

class OrderService extends BaseApiService {
  async list(params?: {
    paymentStatus?: string;
    orderStatus?: string;
    createdBy?: string;
    createdByRole?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<LiverCareOrder[]> {
    const { createdBy, ...rest } = params ?? {};
    const apiParams: Record<string, string | undefined> = { ...rest };
    if (createdBy) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy);
      if (isUuid) {
        apiParams.createdBy = createdBy;
      } else {
        apiParams.createdByRole = createdBy;
      }
    }
    return this.get<LiverCareOrder[]>('/admin/orders', { params: apiParams });
  }

  async getById(id: string): Promise<LiverCareOrder | null> {
    return this.get<LiverCareOrder>(`/admin/orders/${id}`);
  }

  async getTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    return this.get<OrderTimelineEvent[]>(`/admin/orders/${orderId}/timeline`);
  }

  async create(input: CreateOrderInput): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>('/admin/orders', input);
  }

  async transition(orderId: string, event: OrderWorkflowEvent, meta?: Record<string, string>): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/transition`, { event, meta });
  }

  async listAssignableTechnicians(): Promise<AssignableTechnician[]> {
    return this.get<AssignableTechnician[]>('/admin/technicians/assignable');
  }

  async scheduleScan(orderId: string, input: ScheduleScanInput): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/schedule-scan`, input);
  }

  async getScanSlots(orderId: string, date: string): Promise<ScanTimeSlotOption[]> {
    return this.get<ScanTimeSlotOption[]>(`/admin/orders/${orderId}/scan-slots`, { params: { date } });
  }

  async listTechniciansForSlot(scheduledAt: string, orderId?: string): Promise<AssignableTechnician[]> {
    return this.get<AssignableTechnician[]>('/admin/technicians/available-for-slot', {
      params: { scheduledAt, orderId },
    });
  }

  async confirmScanSchedule(
    orderId: string,
    input: ScheduleScanInput & { technicianId: string; technicianName: string },
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/confirm-scan-schedule`, input);
  }

  async getConsultSlots(orderId: string, date: string): Promise<ConsultTimeSlotOption[]> {
    return this.get<ConsultTimeSlotOption[]>(`/admin/orders/${orderId}/consult-slots`, { params: { date } });
  }

  async listDoctorsForConsultSlot(
    scheduledAt: string,
    options?: { language?: string; orderId?: string },
  ): Promise<AssignableDoctor[]> {
    return this.get<AssignableDoctor[]>('/admin/doctors/available-for-slot', {
      params: {
        scheduledAt,
        language: options?.language,
        excludeOrderId: options?.orderId,
      },
    });
  }

  async confirmConsultationSchedule(
    orderId: string,
    input: { doctorId: string; doctorName: string; scheduledAt: string; timeSlot: string },
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/confirm-consultation-schedule`, input);
  }

  async assignTechnician(
    orderId: string,
    technicianId: string,
    technicianName: string,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/assign-technician`, { technicianId, technicianName });
  }

  async assignDoctor(orderId: string, doctorId: string, doctorName: string): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/assign-doctor`, { doctorId, doctorName });
  }

  async scheduleConsultation(
    orderId: string,
    scheduledAt: string,
    slotLabel?: string,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/schedule-consultation`, {
      scheduledAt,
      slotLabel,
    });
  }

  async getWorkflowEvents(orderId: string): Promise<OrderWorkflowEvent[]> {
    return this.get<OrderWorkflowEvent[]>(`/admin/orders/${orderId}/workflow-events`);
  }

  async sendPaymentLink(orderId: string, channels: ('whatsapp' | 'sms' | 'email')[]): Promise<LiverCareOrder> {
    const data = await this.post<LiverCareOrder>(`/admin/orders/${orderId}/send-payment-link`, { channels });
    return data;
  }

  async markOfflinePayment(
    orderId: string,
    body: {
      method: OfflinePaymentRecord['method'];
      amount: number;
      collectedBy: string;
      transactionRef?: string;
      receiptFileId?: string;
      remarks?: string;
    },
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/offline-payment`, body);
  }

  async initiatePortalPayment(orderId: string): Promise<{ paymentId: string; providerOrderId: string }> {
    const order = await this.getById(orderId);
    if (!order) throw new Error('Order not found');
    const payment = getPaymentService();
    const po = await payment.createOrder(orderId, order.finalAmount);
    return { paymentId: po.id, providerOrderId: po.providerOrderId };
  }

  async completePortalPayment(
    orderId: string,
    phone: string,
    method: 'upi' | 'card',
    options?: {
      receiptFileId?: string;
      transactionRef?: string;
      outcome?: 'success' | 'failure';
    },
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/pay`, {
      phone,
      method,
      receiptFileId: options?.receiptFileId,
      transactionRef: options?.transactionRef,
      outcome: options?.outcome,
    });
  }

  async verifyPayment(orderId: string): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/verify-payment`);
  }

  async rejectPayment(orderId: string, remarks?: string): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/admin/orders/${orderId}/reject-payment`, { remarks });
  }

  async getInvoice(orderId: string, phone?: string): Promise<OrderInvoice | null> {
    if (phone) {
      return this.get<OrderInvoice>(`/patient-portal/orders/${orderId}/invoice`, { params: { phone } });
    }
    return this.get<OrderInvoice>(`/admin/orders/${orderId}/invoice`);
  }

  async listOfflinePayments(orderId: string): Promise<OfflinePaymentRecord[]> {
    return this.get<OfflinePaymentRecord[]>(`/admin/orders/${orderId}/offline-payments`);
  }
}

export const liverCareOrderService = new OrderService();
