import type { CreateEnquiryInput } from '@/types/enquiry';
import type { PaymentLink, PaymentOrder, PaymentResult } from '@/types/payment';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { ExtractedField } from '@/types/aiExtraction';

export interface IPaymentService {
  createOrder(orderId: string, amount: number): Promise<PaymentOrder>;
  createPaymentLink(orderId: string, patientId: string, amount: number, channels: ('whatsapp' | 'sms' | 'email')[]): Promise<PaymentLink>;
  simulateSuccess(paymentId: string): Promise<PaymentResult>;
  simulateFailure(paymentId: string): Promise<PaymentResult>;
  getPaymentStatus(orderId: string): Promise<string>;
}

export interface IWhatsAppService {
  receiveEnquiry(payload: CreateEnquiryInput): Promise<{ enquiryId: string }>;
  sendPaymentLink(phone: string, link: string): Promise<{ messageId: string }>;
  sendOrderUpdate(phone: string, message: string): Promise<{ messageId: string }>;
  sendReportReady(phone: string, reportUrl: string): Promise<{ messageId: string }>;
}

export interface FibrosisScanData {
  lsmKpa: number;
  capDbm: number;
  iqr: number;
  iqrMedianPercent: number;
  validMeasurements: number;
  totalMeasurements: number;
  successRatePercent: number;
  probeType: 'M' | 'XL';
  scanAt: string;
  operatorName: string;
  deviceSerial: string;
  fastingStatus: boolean;
  bmi: number;
  interpretation: string;
  steatosisGrade: string;
  fibrosisStage: string;
  remarks?: string;
}

export interface IFibrosisScanDeviceService {
  fetchScanData(orderId: string, deviceSerial?: string): Promise<FibrosisScanData>;
  attachScanFile(orderId: string, fileMeta: { fileName: string; fileType: string }): Promise<{ fileId: string; url: string }>;
}

export interface IAIExtractionService {
  queueExtraction(orderId: string, sourceType: 'pathology' | 'fibrosis_scan', fileId?: string): Promise<AIExtractionJob>;
  getJob(jobId: string): Promise<AIExtractionJob>;
  processJob(jobId: string): Promise<AIExtractionJob>;
}

export interface NotificationLogEntry {
  id: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app';
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'sent' | 'failed';
  sentAt?: string;
  orderId?: string;
  patientId?: string;
}

export interface INotificationService {
  sendSms(phone: string, message: string, meta?: { orderId?: string }): Promise<NotificationLogEntry>;
  sendEmail(email: string, subject: string, body: string, meta?: { orderId?: string }): Promise<NotificationLogEntry>;
  sendWhatsApp(phone: string, message: string, meta?: { orderId?: string }): Promise<NotificationLogEntry>;
  sendInApp(userId: string, title: string, body: string, meta?: { orderId?: string }): Promise<NotificationLogEntry>;
  sendOtp(phone: string): Promise<{ otp: string; expiresAt: string }>;
  listLogs(filters?: { orderId?: string }): NotificationLogEntry[];
}

export interface PDFGenerationResult {
  fileId: string;
  url: string;
  generatedAt: string;
}

export interface IPDFGenerationService {
  generateReportPdf(templateId: string, data: Record<string, unknown>): Promise<PDFGenerationResult>;
  generatePrescriptionPdf(templateId: string, data: Record<string, unknown>): Promise<PDFGenerationResult>;
  generateInvoicePdf(data: Record<string, unknown>): Promise<PDFGenerationResult>;
}

export type { ExtractedField };
