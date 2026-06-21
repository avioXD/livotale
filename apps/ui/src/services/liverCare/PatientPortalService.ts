import axios from 'axios';
import { BaseApiService } from '@/services/base';
import type {
  BankDetailsFull,
  BankDetailsSelfResponse,
  UpsertBankDetailsInput,
} from '@/types/bankDetails';
import type {
  PatientDownloadItem,
  PatientNotification,
  PatientOnboardingPayload,
  PatientOnboardingStatus,
  PatientPortalSession,
  PatientProfile,
  OrderInvoice,
  PatientPaymentConfig,
  PatientEnquiry,
} from '@/types/patientPortal';
import type { LiverCareOrder, PatientPathologyDateRequest, PatientScanDateRequest, PatientConsultDateRequest } from '@/types/serviceOrder';
import { liverCareOrderService } from './OrderService';

class PatientPortalService extends BaseApiService {
  async sendOtp(phone: string): Promise<{ sent: boolean; retryAfterSeconds?: number; demoOtp?: string }> {
    return this.post<{ sent: boolean; retryAfterSeconds?: number; demoOtp?: string }>(
      '/patient-portal/otp/send',
      { phone },
    );
  }

  async verifyOtp(phone: string, otp: string): Promise<PatientPortalSession> {
    return this.post<PatientPortalSession>('/patient-portal/otp/verify', { phone, otp });
  }

  async getOnboardingStatus(phone: string): Promise<PatientOnboardingStatus> {
    return this.get<PatientOnboardingStatus>('/patient-portal/onboarding/status', { params: { phone } });
  }

  async completeOnboarding(payload: PatientOnboardingPayload): Promise<PatientPortalSession> {
    return this.post<PatientPortalSession>('/patient-portal/onboarding/complete', payload);
  }

  async loginWithPassword(identifier: string, password: string): Promise<PatientPortalSession> {
    return this.post<PatientPortalSession>('/auth/patient/login', {
      identifier: identifier.trim(),
      password,
    });
  }

  async listMyOrders(phone: string): Promise<LiverCareOrder[]> {
    return this.get<LiverCareOrder[]>('/patient-portal/orders', { params: { phone } });
  }

  async listMyEnquiries(phone: string): Promise<PatientEnquiry[]> {
    return this.get<PatientEnquiry[]>('/patient-portal/enquiries', { params: { phone } });
  }

  async getMyEnquiry(phone: string, enquiryId: string): Promise<PatientEnquiry> {
    return this.get<PatientEnquiry>(`/patient-portal/enquiries/${enquiryId}`, { params: { phone } });
  }

  async requestScanDate(
    phone: string,
    orderId: string,
    input: PatientScanDateRequest,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/scan-date`, input, {
      params: { phone },
    });
  }

  async requestPathologyDate(
    phone: string,
    orderId: string,
    input: PatientPathologyDateRequest,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/pathology-date`, input, {
      params: { phone },
    });
  }

  async requestConsultDate(
    phone: string,
    orderId: string,
    input: PatientConsultDateRequest,
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/consult-date`, input, {
      params: { phone },
    });
  }

  async getTimeline(phone: string, orderId: string): Promise<import('@/types/serviceOrder').OrderTimelineEvent[]> {
    return this.get(`/patient-portal/orders/${orderId}/timeline`, { params: { phone } });
  }

  async getMyOrder(phone: string, orderId: string): Promise<LiverCareOrder | null> {
    return this.get<LiverCareOrder>(`/patient-portal/orders/${orderId}`, { params: { phone } });
  }

  async payOrder(
    orderId: string,
    phone: string,
    input: {
      method?: 'upi' | 'card';
      receiptFileId?: string;
      transactionRef?: string;
      outcome?: 'success' | 'failure';
    },
  ): Promise<LiverCareOrder> {
    return this.post<LiverCareOrder>(`/patient-portal/orders/${orderId}/pay`, {
      phone,
      method: input.method ?? 'upi',
      receiptFileId: input.receiptFileId,
      transactionRef: input.transactionRef,
      outcome: input.outcome,
    });
  }

  async getPaymentConfig(): Promise<PatientPaymentConfig> {
    return this.get<PatientPaymentConfig>('/patient-portal/payment-config');
  }

  async uploadPaymentReceipt(
    phone: string,
    orderId: string,
    file: File,
  ): Promise<{ fileId: string; storageUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', 'payment_receipt');
    form.append('entityId', orderId);
    return this.post<{ fileId: string; storageUrl: string; confirmed: boolean }>(
      '/patient-portal/storage/upload',
      form,
      {
        params: { phone },
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
  }

  async getInvoice(orderId: string, phone: string): Promise<OrderInvoice | null> {
    return liverCareOrderService.getInvoice(orderId, phone);
  }

  async getProfile(phone: string): Promise<PatientProfile> {
    return this.get<PatientProfile>('/patient-portal/profile', { params: { phone } });
  }

  async updateProfile(
    phone: string,
    patch: Pick<PatientProfile, 'email' | 'city' | 'dateOfBirth'>,
  ): Promise<PatientProfile> {
    return this.patch<PatientProfile>('/patient-portal/profile', { phone, ...patch });
  }

  async listNotifications(phone: string): Promise<PatientNotification[]> {
    return this.get<PatientNotification[]>('/patient-portal/org/notifications', { params: { phone } });
  }

  async markNotificationRead(notificationId: string, phone: string): Promise<void> {
    return this.post(`/patient-portal/org/notifications/${notificationId}/read`, undefined, {
      params: { phone },
    });
  }

  async listDownloads(phone: string): Promise<PatientDownloadItem[]> {
    return this.get<PatientDownloadItem[]>('/patient-portal/downloads', { params: { phone } });
  }

  async getDashboardAnalytics(phone: string) {
    return this.get('/patient-portal/dashboard/analytics', { params: { phone } });
  }

  async getBankDetails(phone: string): Promise<BankDetailsSelfResponse> {
    try {
      return await this.get<BankDetailsSelfResponse>('/patient-portal/bank-details', {
        params: { phone },
        headers: { 'X-Skip-Error-Toast': 'true' },
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return { configured: false };
      }
      throw err instanceof Error ? err : new Error('Failed to load bank details');
    }
  }

  async upsertBankDetails(phone: string, body: UpsertBankDetailsInput): Promise<BankDetailsFull> {
    return this.put<BankDetailsFull>('/patient-portal/bank-details', body, { params: { phone } });
  }

  async uploadVerificationDoc(
    phone: string,
    file: File,
    entityType = 'payout_verification',
    subfolder = 'cheque',
  ): Promise<{ fileId: string; storageUrl: string }> {
    const presign = await this.post<{
      fileId: string;
      uploadUrl: string;
      storageUrl: string;
      mimeType: string;
    }>(
      '/patient-portal/storage/presign',
      {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        entityType,
        subfolder,
      },
      { params: { phone } },
    );

    const putResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': presign.mimeType },
      body: file,
    });
    if (!putResponse.ok) {
      throw new Error('Upload to storage failed');
    }

    const confirmed = await this.post<{ fileId: string; storageUrl: string }>(
      `/patient-portal/storage/${presign.fileId}/confirm`,
      undefined,
      { params: { phone } },
    );
    return { fileId: confirmed.fileId, storageUrl: confirmed.storageUrl };
  }
}

export const patientPortalService = new PatientPortalService();
