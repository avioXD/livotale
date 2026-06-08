import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { getNotificationService } from '@/services/external';
import type {
  PatientDownloadItem,
  PatientNotification,
  PatientPortalSession,
  PatientProfile,
  OrderInvoice,
} from '@/types/patientPortal';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { MOCK_LIVER_ORDERS, MOCK_PATIENT_PORTAL_PHONE } from './liverCare.mock';
import { MOCK_PATIENT_NOTIFICATIONS, MOCK_PATIENT_PROFILES } from './patientPortal.mock';
import { phonesMatch, normalizePhone } from './patientPortal.utils';
import { liverCareOrderService } from './OrderService';
import { finalReportService } from './FinalReportService';
import { prescriptionOrderService } from './PrescriptionOrderService';

const DEV_OTP = '123456';

class PatientPortalService extends BaseApiService {
  async sendOtp(phone: string): Promise<{ sent: boolean }> {
    return mockOrApi(
      async () => {
        const normalized = normalizePhone(phone);
        const hasOrder = MOCK_LIVER_ORDERS.some((o) => phonesMatch(o.patientPhone, normalized));
        if (!hasOrder) {
          throw new Error('No order found for this phone number. Contact operations after placing an order.');
        }
        await getNotificationService().sendOtp(normalized);
        return { sent: true };
      },
      () => this.post<{ sent: boolean }>('/patient-portal/otp/send', { phone }),
    );
  }

  async verifyOtp(phone: string, otp: string): Promise<PatientPortalSession> {
    return mockOrApi(
      () => {
        if (otp !== DEV_OTP) throw new Error('Invalid OTP. Use 123456 in demo mode.');
        const normalized = normalizePhone(phone);
        const order = MOCK_LIVER_ORDERS.find((o) => phonesMatch(o.patientPhone, normalized));
        if (!order) throw new Error('No order found for this phone number.');
        return {
          phone: normalized,
          patientId: order.patientId,
          patientName: order.patientName,
        };
      },
      () => this.post<PatientPortalSession>('/patient-portal/otp/verify', { phone, otp }),
    );
  }

  async listMyOrders(phone: string): Promise<LiverCareOrder[]> {
    return mockOrApi(
      () =>
        MOCK_LIVER_ORDERS.filter((o) => phonesMatch(o.patientPhone, phone)).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      () => this.get<LiverCareOrder[]>('/patient-portal/orders', { params: { phone } }),
    );
  }

  async getMyOrder(phone: string, orderId: string): Promise<LiverCareOrder | null> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => o.id === orderId);
        if (!order || !phonesMatch(order.patientPhone, phone)) return null;
        return order;
      },
      () => this.get<LiverCareOrder>(`/patient-portal/orders/${orderId}`),
    );
  }

  async payOrder(orderId: string, phone: string, method: 'upi' | 'card'): Promise<LiverCareOrder> {
    return liverCareOrderService.completePortalPayment(orderId, phone, method);
  }

  async getInvoice(orderId: string, phone: string): Promise<OrderInvoice | null> {
    return liverCareOrderService.getInvoice(orderId, phone);
  }

  getDemoPhoneHint(): string {
    return MOCK_PATIENT_PORTAL_PHONE;
  }

  async getProfile(phone: string): Promise<PatientProfile> {
    return mockOrApi(
      () => {
        const order = MOCK_LIVER_ORDERS.find((o) => phonesMatch(o.patientPhone, phone));
        if (!order) throw new Error('No profile found');
        const existing = Object.values(MOCK_PATIENT_PROFILES).find((p) => phonesMatch(p.phone, phone));
        if (existing) return existing;
        return {
          patientId: order.patientId,
          phone: normalizePhone(phone),
          name: order.patientName,
          email: null,
          city: null,
          dateOfBirth: null,
          updatedAt: new Date().toISOString(),
        };
      },
      () => this.get<PatientProfile>('/patient-portal/profile', { params: { phone } }),
    );
  }

  async updateProfile(
    phone: string,
    patch: Pick<PatientProfile, 'email' | 'city' | 'dateOfBirth'>,
  ): Promise<PatientProfile> {
    return mockOrApi(
      () => {
        const profile = Object.values(MOCK_PATIENT_PROFILES).find((p) => phonesMatch(p.phone, phone))
          ?? (() => {
            const order = MOCK_LIVER_ORDERS.find((o) => phonesMatch(o.patientPhone, phone))!;
            const created: PatientProfile = {
              patientId: order.patientId,
              phone: normalizePhone(phone),
              name: order.patientName,
              email: null,
              city: null,
              dateOfBirth: null,
              updatedAt: new Date().toISOString(),
            };
            MOCK_PATIENT_PROFILES[order.patientId] = created;
            return created;
          })();
        const updated: PatientProfile = {
          ...profile,
          email: patch.email ?? profile.email,
          city: patch.city ?? profile.city,
          dateOfBirth: patch.dateOfBirth ?? profile.dateOfBirth,
          updatedAt: new Date().toISOString(),
        };
        MOCK_PATIENT_PROFILES[profile.patientId] = updated;
        return updated;
      },
      () => this.patch<PatientProfile>('/patient-portal/profile', { phone, ...patch }),
    );
  }

  async listNotifications(phone: string): Promise<PatientNotification[]> {
    return mockOrApi(
      () => {
        const orderIds = MOCK_LIVER_ORDERS.filter((o) => phonesMatch(o.patientPhone, phone)).map((o) => o.id);
        const seeded = MOCK_PATIENT_NOTIFICATIONS.filter((n) => n.orderId && orderIds.includes(n.orderId));
        const channelLogs = getNotificationService()
          .listLogs()
          .filter((l) => phonesMatch(l.recipient, phone) || (l.orderId && orderIds.includes(l.orderId)))
          .map((l) => ({
            id: l.id,
            channel: l.channel,
            title: l.template,
            body: String(l.payload.message ?? l.payload.body ?? ''),
            orderId: l.orderId ?? null,
            read: false,
            sentAt: l.sentAt ?? new Date().toISOString(),
          } satisfies PatientNotification));
        const merged = [...channelLogs, ...seeded].sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        );
        const seen = new Set<string>();
        return merged.filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
      },
      () => this.get<PatientNotification[]>('/patient-portal/notifications', { params: { phone } }),
    );
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return mockOrApi(
      () => {
        const row = MOCK_PATIENT_NOTIFICATIONS.find((n) => n.id === notificationId);
        if (row) row.read = true;
      },
      () => this.post(`/patient-portal/notifications/${notificationId}/read`),
    );
  }

  async listDownloads(phone: string): Promise<PatientDownloadItem[]> {
    return mockOrApi(
      async () => {
        const orders = MOCK_LIVER_ORDERS.filter((o) => phonesMatch(o.patientPhone, phone));
        const items: PatientDownloadItem[] = [];

        for (const order of orders) {
          if (order.paymentStatus === 'success') {
            const invoice = await liverCareOrderService.getInvoice(order.id, phone);
            if (invoice) {
              items.push({
                id: `dl-inv-${order.id}`,
                type: 'invoice',
                label: `Invoice — ${order.orderNumber}`,
                orderId: order.id,
                orderNumber: order.orderNumber,
                pdfUrl: invoice.pdfUrl,
                availableAt: invoice.paidAt ?? order.updatedAt,
              });
            }
          }

          const report = await finalReportService.getPublishedForPatient(order.id, phone);
          if (report?.pdfUrl) {
            items.push({
              id: `dl-rpt-${order.id}`,
              type: 'report',
              label: `Final report — ${report.reportNumber}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              pdfUrl: report.pdfUrl,
              availableAt: report.publishedAt ?? report.generatedAt,
            });
          }

          const rx = await prescriptionOrderService.getPublishedForPatient(order.id, phone);
          if (rx?.pdfUrl) {
            items.push({
              id: `dl-rx-${order.id}`,
              type: 'prescription',
              label: `Prescription — ${rx.doctorName}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              pdfUrl: rx.pdfUrl,
              availableAt: rx.publishedAt ?? rx.updatedAt,
            });
          }
        }

        return items.sort((a, b) => new Date(b.availableAt).getTime() - new Date(a.availableAt).getTime());
      },
      () => this.get<PatientDownloadItem[]>('/patient-portal/downloads', { params: { phone } }),
    );
  }
}

export const patientPortalService = new PatientPortalService();
