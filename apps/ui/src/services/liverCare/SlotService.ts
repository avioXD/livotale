import { BaseApiService } from '@/services/base';

export interface ScanTimeSlotOption {
  code: string;
  label: string;
  available: boolean;
  scheduledAt: string;
  isPatientPreference?: boolean;
}

export interface ConsultTimeSlotOption {
  code: string;
  label: string;
  available: boolean;
  scheduledAt?: string | null;
  isPatientPreference?: boolean;
}

class SlotService extends BaseApiService {
  async listPublicScanSlots(date: string, city = 'default'): Promise<ScanTimeSlotOption[]> {
    return this.get<ScanTimeSlotOption[]>('/public/slots/scan', { params: { date, city } });
  }

  async listPublicConsultSlots(date: string): Promise<ConsultTimeSlotOption[]> {
    return this.get<ConsultTimeSlotOption[]>('/public/slots/consult', { params: { date } });
  }
}

export const slotService = new SlotService();
