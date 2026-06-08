import type { IconType } from 'react-icons';
import { FiCalendar, FiClipboard, FiCreditCard, FiHome, FiCpu } from 'react-icons/fi';
import { MdOutlineScience } from 'react-icons/md';
import type { OperationsTab } from '@/types/adminOperations';

export interface OperationsTabConfig {
  key: OperationsTab;
  label: string;
  description: string;
  icon: IconType;
}

export const OPERATIONS_TABS: OperationsTabConfig[] = [
  { key: 'overview', label: 'Overview', description: 'Daily KPIs and quick actions', icon: FiHome },
  { key: 'enquiries', label: 'Enquiries', description: 'CRM queue — website, WhatsApp, and manual leads', icon: FiClipboard },
  { key: 'orders', label: 'Orders & payments', description: 'Collect cash, QR, or online payments', icon: FiCreditCard },
  { key: 'partner-lab', label: 'Lab reports', description: 'Blood sample dispatch, lab email PDF upload, AI extraction', icon: MdOutlineScience },
  { key: 'appointments', label: 'Appointments', description: 'Doctor, walk-in, tele & home visits', icon: FiCalendar },
  { key: 'ai-review', label: 'AI review', description: 'Verify pathology data extracted from lab PDFs', icon: FiCpu },
];

export const APPOINTMENT_STATUS_PRESETS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'booked', label: 'Booked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'missed', label: 'Missed' },
  { value: 'no_show', label: 'No show' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PAYMENT_STATUS_PRESETS = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'created', label: 'Created (pharmacy)' },
  { value: 'paid', label: 'Paid' },
];
