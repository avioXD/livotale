import type { InboxNotification } from '@/types/inboxNotification';
import { AppRole } from '@/types/auth';

const now = Date.now();
const mins = (n: number) => new Date(now - n * 60000).toISOString();

const OPS = [AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN];
const TECH = [AppRole.TECHNICIAN];
const DOC = [AppRole.DOCTOR];

export const MOCK_INBOX: InboxNotification[] = [
  {
    id: 'inb-1',
    title: 'New enquiry',
    body: 'Website enquiry from Vikram Patel — PKG-2 interested.',
    category: 'enquiry',
    channel: 'in_app',
    targetRoles: OPS,
    triggerAction: 'enquiry_received',
    read: false,
    createdAt: mins(30),
  },
  {
    id: 'inb-2',
    title: 'Payment pending',
    body: 'Order LFS-2026-0004 (Rohan Mehta) awaiting patient payment.',
    category: 'payment',
    channel: 'push',
    targetRoles: OPS,
    orderId: 'lco-4',
    triggerAction: 'payment_link_sent',
    read: false,
    createdAt: mins(45),
  },
  {
    id: 'inb-3',
    title: 'Sample dispatch due',
    body: 'Blood sample for order LFS-2026-0005 ready — send to Metro Diagnostics.',
    category: 'pathology',
    channel: 'push',
    targetRoles: [...TECH, ...OPS],
    orderId: 'lco-5',
    triggerAction: 'sample_dispatch_pending',
    read: false,
    createdAt: mins(60),
  },
  {
    id: 'inb-4',
    title: 'Lab report awaiting upload',
    body: 'Partner lab emailed PDF for Anita Desai — upload on order LFS-2026-0003.',
    category: 'pathology',
    channel: 'in_app',
    targetRoles: OPS,
    orderId: 'lco-3',
    triggerAction: 'awaiting_lab_report',
    read: false,
    createdAt: mins(120),
  },
  {
    id: 'inb-5',
    title: 'AI review pending',
    body: 'Pathology extraction ready for Kavita Nair (lco-6).',
    category: 'ai',
    channel: 'in_app',
    targetRoles: OPS,
    orderId: 'lco-6',
    triggerAction: 'ai_extraction_ready',
    read: true,
    createdAt: mins(180),
  },
  {
    id: 'inb-6',
    title: 'Consultation scheduled',
    body: 'Video consult with Anita Desai tomorrow 10:00 AM.',
    category: 'consultation',
    channel: 'push',
    targetRoles: DOC,
    orderId: 'lco-3',
    triggerAction: 'consultation_scheduled',
    read: false,
    createdAt: mins(90),
  },
  {
    id: 'inb-7',
    title: 'Visit assigned',
    body: 'Liver Fibrosis Scan visit — Priya Sharma, Andheri East.',
    category: 'scan',
    channel: 'push',
    targetRoles: TECH,
    orderId: 'lco-5',
    triggerAction: 'technician_assigned',
    read: false,
    createdAt: mins(15),
  },
];
