import { BaseApiService } from '@/services/base';

export type IntegrationConfigSource = 'database' | 'env';

export interface PlatformSettings {
  twilioConfigSource?: IntegrationConfigSource;
  twilioMissingFields?: string[];
  twilioAccountSid?: string | null;
  twilioParentAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioMessagingServiceSid?: string | null;
  twilioFromNumber?: string | null;
  twilioVerifyServiceSid?: string | null;
  sendgridConfigSource?: IntegrationConfigSource;
  sendgridMissingFields?: string[];
  sendgridApiKey?: string | null;
  sendgridFromEmail?: string | null;
  sendgridFromName?: string | null;
  aiConfigSource?: IntegrationConfigSource;
  aiMissingFields?: string[];
  aiProvider?: string | null;
  aiApiKey?: string | null;
  aiModel?: string | null;
  aiBaseUrl?: string | null;
  twilioConfigured: boolean;
  sendgridConfigured: boolean;
  aiConfigured: boolean;
  paymentUpiId?: string | null;
  paymentQrFileId?: string | null;
  paymentQrUrl?: string | null;
  paymentPayeeName?: string | null;
  paymentConfigured?: boolean;
  s3Bucket?: string | null;
  s3Region?: string | null;
  s3KeyPrefix?: string | null;
  s3Endpoint?: string | null;
  s3PublicEndpoint?: string | null;
  s3AccessKeyId?: string | null;
  s3SecretAccessKey?: string | null;
  s3ConfigSource?: IntegrationConfigSource;
  s3MissingFields?: string[];
  s3Configured?: boolean;
  updatedAt?: string | null;
}

export interface MessageTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  channel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  updatedAt?: string | null;
}

export interface LetterheadTemplate {
  id: string;
  code: string;
  name: string;
  htmlBody?: string | null;
  active: boolean;
  updatedAt?: string | null;
}

export interface IntegrationStatus {
  integrationsMode: string;
  otpMode: string;
  twilioConfigured: boolean;
  twilioConfigSource: IntegrationConfigSource;
  twilioMissingFields: string[];
  sendgridConfigured: boolean;
  sendgridConfigSource: IntegrationConfigSource;
  sendgridMissingFields: string[];
  aiConfigured: boolean;
  aiConfigSource: IntegrationConfigSource;
  aiMissingFields: string[];
  s3Configured: boolean;
  s3ConfigSource: IntegrationConfigSource;
  s3MissingFields: string[];
  whatsappEnabled: boolean;
  razorpayEnabled: boolean;
}

export interface TwilioConfigTestResult {
  ok: boolean;
  mode: string;
  accountSid?: string | null;
  fromNumber?: string | null;
  senderMode?: string | null;
  accountName?: string | null;
  error?: string | null;
}

export interface S3ConfigTestResult {
  ok: boolean;
  bucket?: string | null;
  region?: string | null;
  endpoint?: string | null;
  error?: string | null;
}

export interface SmsTestLogEntry {
  id: string;
  template?: string | null;
  recipient: string;
  body?: string | null;
  status: string;
  providerSid?: string | null;
  providerStatus?: string | null;
  senderMode?: string | null;
  error?: string | null;
  sentAt: string;
}

class IntegrationsAdminService extends BaseApiService {
  getStatus(): Promise<IntegrationStatus> {
    return this.get<IntegrationStatus>('/admin/integrations/status');
  }

  getSettings(): Promise<PlatformSettings> {
    return this.get<PlatformSettings>('/admin/integrations/settings');
  }

  updateSettings(input: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return this.put<PlatformSettings>('/admin/integrations/settings', input);
  }

  testTwilioConfig(): Promise<TwilioConfigTestResult> {
    return this.post<TwilioConfigTestResult>('/admin/integrations/settings/test-config');
  }

  testS3Config(): Promise<S3ConfigTestResult> {
    return this.post<S3ConfigTestResult>('/admin/integrations/settings/test-storage');
  }

  testSms(phone: string, templateCode: string): Promise<{ phone: string; body: string; sid?: string; status?: string; senderMode?: string }> {
    return this.post('/admin/integrations/settings/test-sms', { phone, templateCode });
  }

  listSmsTestLogs(templateCode?: string): Promise<SmsTestLogEntry[]> {
    return this.get<SmsTestLogEntry[]>('/admin/integrations/settings/sms-test-logs', {
      params: templateCode ? { templateCode } : undefined,
      headers: { 'X-Skip-Error-Toast': 'true' },
    });
  }

  testEmail(email: string, templateCode: string): Promise<{ ok?: boolean; email: string; subject?: string; body?: string; error?: string }> {
    return this.post('/admin/integrations/settings/test-email', { email, templateCode });
  }

  listMessageTemplates(category?: string): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/admin/integrations/message-templates', {
      params: category ? { category } : undefined,
    });
  }

  updateMessageTemplate(
    code: string,
    channel: string,
    input: Partial<Pick<MessageTemplate, 'name' | 'subjectTemplate' | 'bodyTemplate' | 'isActive'>>,
  ): Promise<MessageTemplate> {
    return this.put<MessageTemplate>(`/admin/integrations/message-templates/${code}`, input, {
      params: { channel },
    });
  }

  listPdfTemplates(): Promise<LetterheadTemplate[]> {
    return this.get<LetterheadTemplate[]>('/admin/integrations/pdf-templates');
  }

  updatePdfTemplate(
    code: string,
    input: Partial<Pick<LetterheadTemplate, 'name' | 'htmlBody' | 'active'>>,
  ): Promise<LetterheadTemplate> {
    return this.put<LetterheadTemplate>(`/admin/integrations/pdf-templates/${code}`, input);
  }
}

export const integrationsAdminService = new IntegrationsAdminService();
