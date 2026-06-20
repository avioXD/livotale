import { BaseApiService } from '@/services/base';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type {
  FibrosisScanInput,
  FibrosisScanRecord,
  ScanReportDocumentType,
  TechnicianOrderDetail,
  TechnicianOrderVisit,
} from '@/types/fibrosisScan';
import type { ScanPatientIntake, ScanPatientIntakeInput, FibroScanIntakeInput } from '@/types/scanPatientIntake';

class TechnicianOrderService extends BaseApiService {
  async listAssigned(technicianId?: string): Promise<TechnicianOrderDetail[]> {
    return this.get<TechnicianOrderDetail[]>('/technician/orders', { params: { technicianId } })
  }

  async getOrderDetail(orderId: string): Promise<TechnicianOrderDetail | null> {
    return this.get<TechnicianOrderDetail>(`/technician/orders/${orderId}`)
  }

  async getVisit(orderId: string): Promise<TechnicianOrderVisit | null> {
    return this.get<TechnicianOrderVisit>(`/technician/orders/${orderId}/visit`)
  }

  async getScan(orderId: string): Promise<FibrosisScanRecord | null> {
    return this.get<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan`)
  }

  async getPatientIntake(orderId: string): Promise<ScanPatientIntake | null> {
    return this.get<ScanPatientIntake>(`/technician/orders/${orderId}/patient-intake`)
  }

  async saveOperatorIntake(orderId: string, input: ScanPatientIntakeInput): Promise<ScanPatientIntake> {
    return this.put<ScanPatientIntake>(`/admin/orders/${orderId}/patient-intake`, input)
  }

  async verifyTechnicianIntake(
    orderId: string,
    input: ScanPatientIntakeInput,
    otp: string,
  ): Promise<ScanPatientIntake> {
    return this.post<ScanPatientIntake>(`/technician/orders/${orderId}/patient-intake/verify`, { ...input, otp })
  }

  async sendPatientIntakeOtp(orderId: string): Promise<TechnicianOrderVisit> {
    return this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/patient-intake/otp`, {})
  }

  async submitFibroScanIntake(orderId: string, input: FibroScanIntakeInput): Promise<ScanPatientIntake> {
    return this.post<ScanPatientIntake>(`/technician/orders/${orderId}/fibroscan-intake`, input)
  }

  /** @deprecated Use submitFibroScanIntake */
  async saveDevicePatientCode(orderId: string, devicePatientCode: string): Promise<ScanPatientIntake> {
    const existing = await this.getPatientIntake(orderId);
    return this.submitFibroScanIntake(orderId, {
      devicePatientCode,
      machinePatientName: existing?.name ?? '',
      machinePatientAge: existing?.age ?? 0,
      machinePatientSex: existing?.sex ?? 'female',
      machinePatientPhone: existing?.phone ?? '',
    });
  }

  async operatorVerifyFibroScanIntake(
    orderId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ): Promise<ScanPatientIntake> {
    return this.patch<ScanPatientIntake>(`/admin/orders/${orderId}/fibroscan-intake/verify`, {
          status,
          notes,
        })
  }

  async operatorVerifyIntake(
    orderId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ): Promise<ScanPatientIntake> {
    return this.patch<ScanPatientIntake>(`/admin/orders/${orderId}/patient-intake/verify`, { status, notes })
  }

  async markVisitStarted(orderId: string): Promise<TechnicianOrderVisit> {
    return this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/visit-started`)
  }

  async markReached(orderId: string): Promise<TechnicianOrderVisit> {
    return this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/reached`)
  }

  async fetchDeviceScan(orderId: string, deviceSerial?: string): Promise<FibrosisScanRecord> {
    return this.post<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan/fetch`, { deviceSerial })
  }

  async saveScan(orderId: string, input: FibrosisScanInput): Promise<FibrosisScanRecord> {
    return this.post<FibrosisScanRecord>(`/technician/orders/${orderId}/fibrosis-scan`, input)
  }

  async opsReviewScan(
    orderId: string,
    patch: Pick<FibrosisScanRecord, 'liverStiffnessKpa' | 'capDbm' | 'fibrosisStage' | 'steatosisGrade' | 'interpretation' | 'remarks'>,
  ): Promise<FibrosisScanRecord> {
    return this.patch<FibrosisScanRecord>(`/admin/orders/${orderId}/fibrosis-scan`, patch)
  }

  async attachScanFile(
    orderId: string,
    file: File,
    scanReportDocumentType?: ScanReportDocumentType,
  ): Promise<FibrosisScanRecord> {
    const form = new FormData();
    form.append('file', file);
    if (scanReportDocumentType) {
      form.append('scanReportDocumentType', scanReportDocumentType);
    }
    return this.post<FibrosisScanRecord>(
      `/technician/orders/${orderId}/fibrosis-scan/attach-file`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }

  async sendVisitCompletionOtp(orderId: string): Promise<TechnicianOrderVisit> {
    return this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/visit-completion-otp`, {})
  }

  async completeScan(orderId: string, otp: string): Promise<{ visit: TechnicianOrderVisit; order: LiverCareOrder }> {
    return this.post(`/technician/orders/${orderId}/complete`, { otp })
  }

  async requestRescan(orderId: string): Promise<{ visit: TechnicianOrderVisit; scan: null }> {
    return this.post(`/technician/orders/${orderId}/fibrosis-scan/rescan`)
  }

  async markUnable(orderId: string, reason: string): Promise<TechnicianOrderVisit> {
    return this.post<TechnicianOrderVisit>(`/technician/orders/${orderId}/unable`, { reason })
  }
}

export const technicianOrderService = new TechnicianOrderService();
