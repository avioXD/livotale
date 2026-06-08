import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type { CreateOrderInput, LiverCareOrder, OrderTimelineEvent } from '@/types/serviceOrder';
import type { OrderWorkflowEvent } from './orderWorkflow';
import { applyTransition, canTransition, getApplicableEvents, getPackageFlags } from './orderWorkflow';
import {
  MOCK_ASSIGNABLE_TECHNICIANS,
  MOCK_TECH_VISITS,
  type AssignableTechnician,
} from './technicianOrder.mock';
import {
  MOCK_ENQUIRIES,
  MOCK_LIVER_ORDERS,
  MOCK_ORDER_TIMELINES,
  MOCK_PACKAGES,
  nextOrderNumber,
} from './liverCare.mock';
import { appendOrderTimeline, formatTransitionDetail } from './orderTimeline';
import { MOCK_CONSULTATIONS } from './consultation.mock';
import type { Consultation } from '@/types/consultation';
import { getPaymentService, getNotificationService, getPDFGenerationService } from '@/services/external';
import type { OfflinePaymentRecord } from '@/types/payment';
import type { OrderInvoice } from '@/types/patientPortal';
import { phonesMatch } from './patientPortal.utils';

const MOCK_OFFLINE_PAYMENTS: OfflinePaymentRecord[] = [];
const MOCK_INVOICES: Record<string, OrderInvoice> = {};

class OrderService extends BaseApiService {
  async list(params?: {
    paymentStatus?: string;
    orderStatus?: string;
    createdBy?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<LiverCareOrder[]> {
    return mockOrApi(
      () => {
        let rows = [...MOCK_LIVER_ORDERS];
        if (params?.paymentStatus) rows = rows.filter((o) => o.paymentStatus === params.paymentStatus);
        if (params?.orderStatus) rows = rows.filter((o) => o.orderStatus === params.orderStatus);
        if (params?.createdBy) rows = rows.filter((o) => o.createdBy === params.createdBy);
        if (params?.assignedTo) {
          if (params.assignedTo === 'unassigned') {
            rows = rows.filter((o) => !o.technicianId && !o.doctorId && !o.partnerLabId);
          } else {
            rows = rows.filter(
              (o) =>
                o.technicianId === params.assignedTo ||
                o.doctorId === params.assignedTo ||
                o.partnerLabId === params.assignedTo,
            );
          }
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          rows = rows.filter(
            (o) =>
              o.orderNumber.toLowerCase().includes(q) ||
              o.patientName.toLowerCase().includes(q) ||
              o.patientPhone.includes(q),
          );
        }
        return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      () => this.get<LiverCareOrder[]>('/admin/orders', { params }),
    );
  }

  async getById(id: string): Promise<LiverCareOrder | null> {
    return mockOrApi(
      () => MOCK_LIVER_ORDERS.find((o) => o.id === id) ?? null,
      () => this.get<LiverCareOrder>(`/admin/orders/${id}`),
    );
  }

  async getTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    return mockOrApi(
      () => MOCK_ORDER_TIMELINES[orderId] ?? [],
      () => this.get<OrderTimelineEvent[]>(`/admin/orders/${orderId}/timeline`),
    );
  }

  async create(input: CreateOrderInput & { patientName: string; patientPhone: string }): Promise<LiverCareOrder> {
    return mockOrApi(
      () => {
        const pkg = MOCK_PACKAGES.find((p) => p.id === input.packageId);
        if (!pkg) throw new Error('Package not found');
        const discount = input.discount ?? 0;
        const order: LiverCareOrder = {
          id: `lco-${Date.now()}`,
          orderNumber: nextOrderNumber(),
          patientId: input.patientId,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          enquiryId: input.enquiryId ?? null,
          packageId: pkg.id,
          packageCode: pkg.code,
          packageName: pkg.name,
          packagePrice: pkg.price,
          discount,
          finalAmount: (pkg.discountPrice ?? pkg.price) - discount,
          paymentMode: input.paymentMode ?? null,
          paymentStatus: 'pending',
          orderStatus: input.paymentMode ? 'payment_pending' : 'created',
          scanScheduledAt: input.scanScheduledAt ?? null,
          createdBy: 'operations',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MOCK_LIVER_ORDERS.unshift(order);
        appendOrderTimeline(order.id, 'order_created', {
          performedBy: 'operations',
          detail: `${order.packageCode} · ₹${order.finalAmount.toLocaleString('en-IN')}`,
          metadata: { packageCode: order.packageCode, amount: String(order.finalAmount) },
        });

        if (input.enquiryId) {
          const eqIdx = MOCK_ENQUIRIES.findIndex((e) => e.id === input.enquiryId);
          if (eqIdx >= 0) {
            const existing = MOCK_ENQUIRIES[eqIdx];
            // Repeat order: keep linked patient; first order: link new patient id to enquiry.
            const patientId = input.skipPatientCreation && existing.patientId
              ? existing.patientId
              : input.patientId;
            MOCK_ENQUIRIES[eqIdx] = {
              ...existing,
              status: 'converted',
              patientId,
              orderId: order.id,
              orderOutcome: existing.orderOutcome ?? 'confirmed',
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return order;
      },
      () => this.post<LiverCareOrder>('/admin/orders', input),
    );
  }

  async transition(orderId: string, event: OrderWorkflowEvent, meta?: Record<string, string>): Promise<LiverCareOrder> {
    return mockOrApi(
      () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId)!;
        const flags = getPackageFlags(pkg);
        const updated = applyTransition(order, event, flags);

        if (meta?.technicianId) {
          updated.technicianId = meta.technicianId;
          updated.technicianName = meta.technicianName ?? 'Assigned Technician';
        }
        if (meta?.doctorId) {
          updated.doctorId = meta.doctorId;
          updated.doctorName = meta.doctorName ?? 'Assigned Doctor';
        }
        if (meta?.partnerLabId) {
          updated.partnerLabId = meta.partnerLabId;
          updated.partnerLabName = meta.partnerLabName ?? 'Partner Lab';
        }

        if (event === 'payment_completed') {
          updated.paymentStatus = 'success';
        }

        MOCK_LIVER_ORDERS[idx] = updated;
        appendOrderTimeline(orderId, event, {
          performedBy: 'operations',
          detail: formatTransitionDetail(event, meta),
          metadata: meta,
        });
        return updated;
      },
      () => this.post<LiverCareOrder>(`/admin/orders/${orderId}/transition`, { event, meta }),
    );
  }

  async listAssignableTechnicians(): Promise<AssignableTechnician[]> {
    return mockOrApi(
      () => [...MOCK_ASSIGNABLE_TECHNICIANS],
      () => this.get<AssignableTechnician[]>('/admin/technicians/assignable'),
    );
  }

  async assignTechnician(
    orderId: string,
    technicianId: string,
    technicianName: string,
  ): Promise<LiverCareOrder> {
    return mockOrApi(
      () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        if (order.orderStatus === 'cancelled') throw new Error('Cannot assign technician to a cancelled order');
        if (order.orderStatus === 'completed') throw new Error('Order is complete — technician cannot be changed');

        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId)!;
        const flags = getPackageFlags(pkg);
        const previousName = order.technicianName;
        const isReassign = Boolean(order.technicianId);

        let updated: LiverCareOrder = {
          ...order,
          technicianId,
          technicianName,
          updatedAt: new Date().toISOString(),
        };

        if (canTransition(order, 'assign_technician', flags)) {
          updated = applyTransition(updated, 'assign_technician', flags);
          updated.technicianId = technicianId;
          updated.technicianName = technicianName;
        }

        MOCK_LIVER_ORDERS[idx] = updated;

        const visit = MOCK_TECH_VISITS[orderId];
        if (visit) {
          visit.technicianId = technicianId;
        }

        appendOrderTimeline(orderId, isReassign ? 'technician_reassigned' : 'assign_technician', {
          performedBy: 'operations',
          detail: isReassign
            ? `Changed from ${previousName ?? 'unassigned'} to ${technicianName}`
            : `Assigned to ${technicianName}`,
          metadata: { technicianId, technicianName },
        });

        return updated;
      },
      () => this.post<LiverCareOrder>(`/admin/orders/${orderId}/assign-technician`, { technicianId, technicianName }),
    );
  }

  async assignDoctor(orderId: string, doctorId: string, doctorName: string): Promise<LiverCareOrder> {
    return mockOrApi(
      () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        if (order.orderStatus === 'cancelled') throw new Error('Cannot assign doctor to a cancelled order');
        if (order.orderStatus === 'completed') throw new Error('Order is complete — doctor cannot be changed');

        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId)!;
        const flags = getPackageFlags(pkg);
        const previousName = order.doctorName;
        const isReassign = Boolean(order.doctorId);

        let updated: LiverCareOrder = {
          ...order,
          doctorId,
          doctorName,
          updatedAt: new Date().toISOString(),
        };

        const applyAssignTransition = (current: LiverCareOrder): LiverCareOrder => {
          if (!canTransition(current, 'assign_doctor', flags)) return current;
          const next = applyTransition(current, 'assign_doctor', flags);
          return { ...next, doctorId, doctorName };
        };

        updated = applyAssignTransition(updated);
        updated = applyAssignTransition(updated);

        MOCK_LIVER_ORDERS[idx] = updated;

        const existing = MOCK_CONSULTATIONS[orderId];
        const consultation: Consultation = existing ?? {
          id: `con-${orderId}`,
          orderId,
          patientId: order.patientId,
          doctorId,
          doctorName,
          consultationType: 'video',
          status: 'doctor_assigned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        consultation.doctorId = doctorId;
        consultation.doctorName = doctorName;
        consultation.status = updated.orderStatus === 'doctor_assigned' ? 'doctor_assigned' : consultation.status;
        consultation.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = consultation;

        appendOrderTimeline(orderId, isReassign ? 'doctor_reassigned' : 'assign_doctor', {
          performedBy: 'operations',
          detail: isReassign
            ? `Changed from ${previousName ?? 'unassigned'} to ${doctorName}`
            : `Assigned to ${doctorName}`,
          metadata: { doctorId, doctorName },
        });

        return updated;
      },
      () => this.post<LiverCareOrder>(`/admin/orders/${orderId}/assign-doctor`, { doctorId, doctorName }),
    );
  }

  async scheduleConsultation(
    orderId: string,
    scheduledAt: string,
    slotLabel?: string,
  ): Promise<LiverCareOrder> {
    return mockOrApi(
      () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        if (!order.doctorId) throw new Error('Assign a doctor before scheduling consultation');

        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId)!;
        const flags = getPackageFlags(pkg);

        let updated = order;
        if (canTransition(order, 'schedule_consultation', flags)) {
          updated = applyTransition(order, 'schedule_consultation', flags);
        } else if (order.orderStatus !== 'consultation_pending') {
          throw new Error('Consultation cannot be scheduled at this stage');
        }

        updated = {
          ...updated,
          consultationScheduledAt: scheduledAt,
          updatedAt: new Date().toISOString(),
        };
        MOCK_LIVER_ORDERS[idx] = updated;

        const consultation = MOCK_CONSULTATIONS[orderId] ?? {
          id: `con-${orderId}`,
          orderId,
          patientId: order.patientId,
          doctorId: order.doctorId!,
          doctorName: order.doctorName ?? 'Assigned Doctor',
          consultationType: 'video' as const,
          status: 'consultation_scheduled' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        consultation.scheduledAt = scheduledAt;
        consultation.consultationType = 'video';
        consultation.meetingLink = consultation.meetingLink ?? `https://meet.livotale.demo/${orderId}`;
        consultation.status = 'consultation_scheduled';
        consultation.updatedAt = new Date().toISOString();
        MOCK_CONSULTATIONS[orderId] = consultation;

        appendOrderTimeline(orderId, 'schedule_consultation', {
          performedBy: 'operations',
          detail: `Video consult · ${new Date(scheduledAt).toLocaleString()}${slotLabel ? ` · ${slotLabel}` : ''}`,
          metadata: { scheduledAt, doctorId: order.doctorId, doctorName: order.doctorName ?? '' },
        });

        return updated;
      },
      () =>
        this.post<LiverCareOrder>(`/admin/orders/${orderId}/schedule-consultation`, {
          scheduledAt,
          slotLabel,
        }),
    );
  }

  async getWorkflowEvents(orderId: string): Promise<OrderWorkflowEvent[]> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) return [];
        const pkg = MOCK_PACKAGES.find((p) => p.id === order.packageId)!;
        return getApplicableEvents(order, getPackageFlags(pkg));
      },
      () => this.get<OrderWorkflowEvent[]>(`/admin/orders/${orderId}/workflow-events`),
    );
  }

  async sendPaymentLink(orderId: string, channels: ('whatsapp' | 'sms' | 'email')[]): Promise<LiverCareOrder> {
    const order = await this.getById(orderId);
    if (!order) throw new Error('Order not found');
    const payment = getPaymentService();
    await payment.createPaymentLink(orderId, order.patientId, order.finalAmount, channels);
    const notif = getNotificationService();
    for (const ch of channels) {
      if (ch === 'whatsapp') await notif.sendWhatsApp(order.patientPhone, `Pay ₹${order.finalAmount} for order ${order.orderNumber}`, { orderId });
      if (ch === 'sms') await notif.sendSms(order.patientPhone, `Livotale payment link sent for ${order.orderNumber}`, { orderId });
    }
    const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
    MOCK_LIVER_ORDERS[idx] = {
      ...order,
      paymentMode: 'online_link',
      paymentStatus: 'link_sent',
      orderStatus: order.orderStatus === 'created' ? 'payment_pending' : order.orderStatus,
      updatedAt: new Date().toISOString(),
    };
    appendOrderTimeline(orderId, 'payment_link_sent', {
      performedBy: 'operations',
      detail: `₹${order.finalAmount.toLocaleString('en-IN')} · Sent via ${channels.join(', ')}`,
      metadata: { channels: channels.join(', '), amount: String(order.finalAmount) },
    });
    return MOCK_LIVER_ORDERS[idx];
  }

  async markOfflinePayment(
    orderId: string,
    body: {
      method: OfflinePaymentRecord['method'];
      amount: number;
      collectedBy: string;
      transactionRef?: string;
      remarks?: string;
    },
  ): Promise<LiverCareOrder> {
    return mockOrApi(
      async () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        const paidAt = new Date().toISOString();

        MOCK_OFFLINE_PAYMENTS.push({
          id: `offpay-${Date.now()}`,
          orderId,
          amount: body.amount,
          method: body.method,
          transactionRef: body.transactionRef ?? null,
          paidAt,
          collectedBy: body.collectedBy,
          remarks: body.remarks ?? null,
        });

        let updated = order;
        try {
          updated = applyTransition(
            order,
            'payment_completed',
            getPackageFlags(MOCK_PACKAGES.find((p) => p.id === order.packageId)!),
          );
        } catch {
          updated = { ...order };
        }

        updated = {
          ...updated,
          paymentMode: 'offline',
          paymentStatus: 'success',
          orderStatus: updated.orderStatus === 'created' || updated.orderStatus === 'payment_pending'
            ? 'payment_completed'
            : updated.orderStatus,
          updatedAt: paidAt,
        };
        MOCK_LIVER_ORDERS[idx] = updated;
        appendOrderTimeline(orderId, 'payment_completed', {
          performedBy: body.collectedBy,
          detail: `₹${body.amount.toLocaleString('en-IN')} via ${body.method}${body.transactionRef ? ` · Ref ${body.transactionRef}` : ''}`,
          metadata: {
            method: body.method,
            amount: String(body.amount),
            ...(body.transactionRef ? { transactionRef: body.transactionRef } : {}),
          },
        });
        await this.ensureInvoice(updated);
        return updated;
      },
      () => this.post<LiverCareOrder>(`/admin/orders/${orderId}/offline-payment`, body),
    );
  }

  async initiatePortalPayment(orderId: string): Promise<{ paymentId: string; providerOrderId: string }> {
    const order = await this.getById(orderId);
    if (!order) throw new Error('Order not found');
    const payment = getPaymentService();
    const po = await payment.createOrder(orderId, order.finalAmount);
    const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      MOCK_LIVER_ORDERS[idx] = {
        ...MOCK_LIVER_ORDERS[idx],
        paymentMode: 'patient_portal',
        paymentStatus: 'processing',
        updatedAt: new Date().toISOString(),
      };
    }
    return { paymentId: po.id, providerOrderId: po.providerOrderId };
  }

  async completePortalPayment(
    orderId: string,
    phone: string,
    method: 'upi' | 'card',
    outcome: 'success' | 'failure' = 'success',
  ): Promise<LiverCareOrder> {
    return mockOrApi(
      async () => {
        const idx = MOCK_LIVER_ORDERS.findIndex((o) => o.id === orderId);
        if (idx < 0) throw new Error('Order not found');
        const order = MOCK_LIVER_ORDERS[idx];
        if (!phonesMatch(order.patientPhone, phone)) throw new Error('Order not found');

        const payment = getPaymentService();
        const po = await payment.createOrder(orderId, order.finalAmount);

        if (outcome === 'failure') {
          await payment.simulateFailure(po.id);
          MOCK_LIVER_ORDERS[idx] = {
            ...order,
            paymentMode: 'patient_portal',
            paymentStatus: 'failed',
            updatedAt: new Date().toISOString(),
          };
          appendOrderTimeline(orderId, 'payment_failed', {
            performedBy: 'patient',
            detail: `Patient portal checkout failed · ${method.toUpperCase()}`,
            metadata: { method },
          });
          return MOCK_LIVER_ORDERS[idx];
        }

        await payment.simulateSuccess(po.id);
        let updated = order;
        try {
          updated = applyTransition(
            order,
            'payment_completed',
            getPackageFlags(MOCK_PACKAGES.find((p) => p.id === order.packageId)!),
          );
        } catch {
          updated = { ...order };
        }
        updated = {
          ...updated,
          paymentMode: 'patient_portal',
          paymentStatus: 'success',
          orderStatus: updated.orderStatus === 'payment_pending' ? 'payment_completed' : updated.orderStatus,
          updatedAt: new Date().toISOString(),
        };
        MOCK_LIVER_ORDERS[idx] = updated;
        appendOrderTimeline(orderId, 'payment_completed', {
          performedBy: 'patient',
          detail: `₹${order.finalAmount.toLocaleString('en-IN')} via patient portal · ${method.toUpperCase()}`,
          metadata: { method, amount: String(order.finalAmount) },
        });
        await getNotificationService().sendWhatsApp(
          order.patientPhone,
          `Payment of ₹${order.finalAmount} received for ${order.orderNumber}`,
          { orderId },
        );
        await this.ensureInvoice(updated);
        return updated;
      },
      () => this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/pay`, { method, outcome }),
    );
  }

  private async ensureInvoice(order: LiverCareOrder): Promise<OrderInvoice> {
    if (MOCK_INVOICES[order.id]) return MOCK_INVOICES[order.id];
    const pdf = getPDFGenerationService();
    const result = await pdf.generateInvoicePdf({
      orderId: order.id,
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      amount: order.finalAmount,
    });
    const invoice: OrderInvoice = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      amount: order.finalAmount,
      paidAt: new Date().toISOString(),
      pdfUrl: result.url,
      fileId: result.fileId,
    };
    MOCK_INVOICES[order.id] = invoice;
    return invoice;
  }

  async getInvoice(orderId: string, phone?: string): Promise<OrderInvoice | null> {
    return mockOrApi(
      async () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order) return null;
        if (phone && !phonesMatch(order.patientPhone, phone)) return null;
        if (order.paymentStatus !== 'success') return null;
        if (MOCK_INVOICES[orderId]) return MOCK_INVOICES[orderId];
        return this.ensureInvoice(order);
      },
      () => this.get<OrderInvoice>(`/admin/orders/${orderId}/invoice`),
    );
  }

  async listOfflinePayments(orderId: string): Promise<OfflinePaymentRecord[]> {
    return mockOrApi(
      () => MOCK_OFFLINE_PAYMENTS.filter((p) => p.orderId === orderId),
      () => this.get<OfflinePaymentRecord[]>(`/admin/orders/${orderId}/offline-payments`),
    );
  }
}

export const liverCareOrderService = new OrderService();
