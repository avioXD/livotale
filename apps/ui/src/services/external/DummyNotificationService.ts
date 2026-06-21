import type { INotificationService, NotificationLogEntry } from './types';

const DEV_OTP = '123456';
const logs: NotificationLogEntry[] = [];

function pushLog(entry: Omit<NotificationLogEntry, 'id' | 'sentAt'> & { sentAt?: string }): NotificationLogEntry {
  const row: NotificationLogEntry = {
    ...entry,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sentAt: entry.sentAt ?? new Date().toISOString(),
    status: entry.status ?? 'sent',
  };
  logs.unshift(row);
  return row;
}

export class DummyNotificationService implements INotificationService {
  async sendSms(phone: string, message: string, meta?: { orderId?: string }): Promise<NotificationLogEntry> {
    return pushLog({ channel: 'sms', recipient: phone, template: 'generic', payload: { message }, status: 'sent', orderId: meta?.orderId });
  }

  async sendEmail(email: string, subject: string, body: string, meta?: { orderId?: string }): Promise<NotificationLogEntry> {
    return pushLog({ channel: 'email', recipient: email, template: subject, payload: { body }, status: 'sent', orderId: meta?.orderId });
  }

  async sendWhatsApp(phone: string, message: string, meta?: { orderId?: string }): Promise<NotificationLogEntry> {
    return pushLog({ channel: 'whatsapp', recipient: phone, template: 'generic', payload: { message }, status: 'sent', orderId: meta?.orderId });
  }

  async sendInApp(userId: string, title: string, body: string, meta?: { orderId?: string }): Promise<NotificationLogEntry> {
    return pushLog({ channel: 'in_app', recipient: userId, template: title, payload: { body }, status: 'sent', orderId: meta?.orderId });
  }

  async sendOtp(phone: string): Promise<{ otp: string; expiresAt: string }> {
    await this.sendSms(phone, `Your Livotale OTP is ${DEV_OTP} (dummy — dev only)`);
    return { otp: DEV_OTP, expiresAt: new Date(Date.now() + 10 * 60000).toISOString() };
  }

  listLogs(filters?: { orderId?: string }): NotificationLogEntry[] {
    if (!filters?.orderId) return [...logs];
    return logs.filter((l) => l.orderId === filters.orderId);
  }
}

export const dummyNotificationService = new DummyNotificationService();
