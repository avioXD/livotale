import { BaseApiService } from '@/services/base';
import type { InboxNotification, InboxNotificationCategory } from '@/types/inboxNotification';
import { AppRole } from '@/types/auth';
export interface PushNotificationInput {
  title: string;
  body: string;
  category: InboxNotificationCategory;
  triggerAction: string;
  targetRoles: AppRole[];
  orderId?: string;
  targetPhone?: string;
}

class InboxNotificationService extends BaseApiService {
  async listForRole(role: AppRole | null): Promise<InboxNotification[]> {
    return this.get<InboxNotification[]>('/notifications/inbox', { params: { role } })
  }

  async listForPatientPhone(phone: string): Promise<InboxNotification[]> {
    return this.get<InboxNotification[]>('/notifications/inbox/patient', { params: { phone } });
  }

  async unreadCount(role: AppRole | null): Promise<number> {
    const items = await this.listForRole(role);
    return items.filter((n) => !n.read).length;
  }

  async unreadCountForPhone(phone: string): Promise<number> {
    const items = await this.listForPatientPhone(phone);
    return items.filter((n) => !n.read).length;
  }

  async markRead(id: string): Promise<void> {
    return this.patch(`/notifications/inbox/${id}/read`)
  }

  async markAllRead(role: AppRole | null): Promise<void> {
    return this.patch('/notifications/inbox/read-all', { role })
  }

  /** Push in-app notification — call from domain services on workflow events */
  async push(input: PushNotificationInput): Promise<InboxNotification> {
    return this.post<InboxNotification>('/notifications/inbox', input)
  }
}

export const inboxNotificationService = new InboxNotificationService();

export function notifyOps(title: string, body: string, triggerAction: string, orderId?: string): void {
  void inboxNotificationService.push({
    title,
    body,
    category: 'order',
    triggerAction,
    targetRoles: [AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN],
    orderId,
  });
}

export function notifyTechnician(title: string, body: string, triggerAction: string, orderId?: string): void {
  void inboxNotificationService.push({
    title,
    body,
    category: 'scan',
    triggerAction,
    targetRoles: [AppRole.TECHNICIAN],
    orderId,
  });
}

export function notifyDoctor(title: string, body: string, triggerAction: string, orderId?: string): void {
  void inboxNotificationService.push({
    title,
    body,
    category: 'consultation',
    triggerAction,
    targetRoles: [AppRole.DOCTOR],
    orderId,
  });
}

export function notifyPatient(phone: string, title: string, body: string, triggerAction: string, orderId?: string): void {
  void inboxNotificationService.push({
    title,
    body,
    category: 'order',
    triggerAction,
    targetRoles: [],
    targetPhone: phone,
    orderId,
  });
}
