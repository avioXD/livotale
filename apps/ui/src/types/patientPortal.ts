export interface PatientPortalSession {
  phone: string;
  patientId: string;
  patientName: string;
  needsOnboarding?: boolean;
}

export interface PatientOnboardingStatus {
  needsOnboarding: boolean;
  patientId: string;
  patientName: string;
}

export interface PatientOnboardingPayload {
  phone: string;
  fullName: string;
  email?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export interface PatientPortalOrderSummary {
  id: string;
  orderNumber: string;
  packageName: string;
  finalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

export interface OrderInvoice {
  orderId: string;
  orderNumber: string;
  patientName: string;
  amount: number;
  paidAt?: string | null;
  pdfUrl: string;
  fileId: string;
}

export interface PatientPaymentConfig {
  upiId?: string | null;
  qrImageUrl?: string | null;
  payeeName?: string | null;
}

export interface PatientProfile {
  patientId: string;
  phone: string;
  name: string;
  email?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  updatedAt: string;
}

export type PatientEnquiryStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'not_interested'
  | 'follow_up_required'
  | 'converted'
  | 'closed';

export interface PatientEnquiry {
  id: string;
  enquiryNumber: string;
  status: PatientEnquiryStatus;
  patientStatusLabel: string;
  enquiryAt: string;
  preferredPackageName?: string | null;
  preferredPackageCode?: string | null;
  message?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
}

export type PatientNotificationChannel = 'whatsapp' | 'sms' | 'email' | 'in_app';

export interface PatientNotification {
  id: string;
  channel: PatientNotificationChannel;
  title: string;
  body: string;
  orderId?: string | null;
  read: boolean;
  sentAt: string;
}

export type PatientDownloadType = 'invoice' | 'report' | 'prescription';

export interface PatientDownloadItem {
  id: string;
  type: PatientDownloadType;
  label: string;
  orderId: string;
  orderNumber: string;
  pdfUrl: string;
  availableAt: string;
}
