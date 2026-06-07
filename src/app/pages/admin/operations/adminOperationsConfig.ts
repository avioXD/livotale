import type { IconType } from 'react-icons';
import { FiCalendar, FiCreditCard, FiHome } from 'react-icons/fi';
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
  { key: 'appointments', label: 'Appointments', description: 'Doctor, walk-in, tele & home visits', icon: FiCalendar },
  { key: 'samples', label: 'Sample collections', description: 'Collection requests & technician assignment', icon: MdOutlineScience },
  { key: 'orders', label: 'Orders & payments', description: 'Collect cash, QR, or online payments', icon: FiCreditCard },
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
