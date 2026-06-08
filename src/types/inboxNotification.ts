import type { AppRole } from '@/types/auth';

export type InboxChannel = 'in_app' | 'whatsapp' | 'sms' | 'email' | 'push';

export type InboxNotificationCategory =
  | 'enquiry'
  | 'order'
  | 'payment'
  | 'scan'
  | 'pathology'
  | 'ai'
  | 'report'
  | 'consultation'
  | 'prescription'
  | 'system';

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  category: InboxNotificationCategory;
  channel: InboxChannel;
  /** Staff roles that should see this notification */
  targetRoles: AppRole[];
  /** Optional order link */
  orderId?: string | null;
  /** Patient phone for patient-portal notifications */
  targetPhone?: string | null;
  triggerAction: string;
  read: boolean;
  createdAt: string;
}
