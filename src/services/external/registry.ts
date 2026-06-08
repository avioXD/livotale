import type {
  IAIExtractionService,
  IFibrosisScanDeviceService,
  INotificationService,
  IPaymentService,
  IPDFGenerationService,
  IWhatsAppService,
} from './types';
import { dummyPaymentService } from './DummyPaymentService';
import { dummyWhatsAppService } from './DummyWhatsAppService';
import { dummyFibrosisScanDeviceService } from './DummyFibrosisScanDeviceService';
import { dummyAIExtractionService } from './DummyAIExtractionService';
import { dummyNotificationService } from './DummyNotificationService';
import { dummyPDFGenerationService } from './DummyPDFGenerationService';

export type ExternalServicesMode = 'dummy' | 'live';

const mode: ExternalServicesMode =
  import.meta.env.VITE_EXTERNAL_SERVICES_MODE === 'live' ? 'live' : 'dummy';

export function getExternalServicesMode(): ExternalServicesMode {
  return mode;
}

export function getPaymentService(): IPaymentService {
  if (mode === 'live') throw new Error('Live payment service not configured');
  return dummyPaymentService;
}

export function getWhatsAppService(): IWhatsAppService {
  if (mode === 'live') throw new Error('Live WhatsApp service not configured');
  return dummyWhatsAppService;
}

export function getFibrosisScanDeviceService(): IFibrosisScanDeviceService {
  if (mode === 'live') throw new Error('Live fibrosis scan device service not configured');
  return dummyFibrosisScanDeviceService;
}

export function getAIExtractionService(): IAIExtractionService {
  if (mode === 'live') throw new Error('Live AI extraction service not configured');
  return dummyAIExtractionService;
}

export function getNotificationService(): INotificationService {
  if (mode === 'live') throw new Error('Live notification service not configured');
  return dummyNotificationService;
}

export function getPDFGenerationService(): IPDFGenerationService {
  if (mode === 'live') throw new Error('Live PDF generation service not configured');
  return dummyPDFGenerationService;
}
