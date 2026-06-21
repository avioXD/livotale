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
  { key: 'orders', label: 'Orders', description: 'Order workflow status — open an order for payment and step actions', icon: FiCreditCard },
  { key: 'partner-lab', label: 'Lab reports', description: 'Blood sample dispatch, lab email PDF upload, AI extraction', icon: MdOutlineScience },
  { key: 'appointments', label: 'Appointments', description: 'PKG-3 consultation queue — assign doctor, schedule slot, view Rx', icon: FiCalendar },
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

export const CONSULTATION_QUEUE_STAGE_PRESETS = [
  { value: '', label: 'All stages' },
  { value: 'awaiting_doctor', label: 'Assign doctor' },
  { value: 'doctor_assigned', label: 'Schedule consultation' },
  { value: 'scheduled', label: 'Consultation scheduled' },
  { value: 'prescription_pending', label: 'Awaiting prescription' },
  { value: 'prescription_ready', label: 'Prescription published' },
  { value: 'completed', label: 'Completed' },
];

export const LAB_DISPATCH_STATUS_PRESETS = [
  { value: '', label: 'All stages' },
  { value: 'not_started', label: 'Lab not assigned' },
  { value: 'pending_dispatch', label: 'Awaiting collection' },
  { value: 'sample_collected', label: 'Sample collected' },
  { value: 'dispatched', label: 'Submitted to lab' },
  { value: 'received_at_lab', label: 'Received at lab' },
  { value: 'awaiting_report', label: 'Awaiting PDF (email)' },
  { value: 'report_uploaded', label: 'PDF uploaded' },
];

export const LAB_AI_STATUS_PRESETS = [
  { value: '', label: 'All AI statuses' },
  { value: 'not_started', label: 'Not started' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'extracted', label: 'Extracted' },
  { value: 'review_pending', label: 'Pending review' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
  { value: 'reupload_required', label: 'Re-upload required' },
];

export const PAYMENT_STATUS_PRESETS = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'created', label: 'Created (pharmacy)' },
  { value: 'paid', label: 'Paid' },
];
