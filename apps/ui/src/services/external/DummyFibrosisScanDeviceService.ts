import type { FibrosisScanData, IFibrosisScanDeviceService } from './types';

export class DummyFibrosisScanDeviceService implements IFibrosisScanDeviceService {
  async fetchScanData(orderId: string, deviceSerial = 'FS-DEMO-001'): Promise<FibrosisScanData> {
    const seed = orderId.charCodeAt(orderId.length - 1) % 5;
    const stages = ['F0', 'F1', 'F2', 'F3', 'F4'];
    const interpretations = ['Normal', 'Mild fibrosis', 'Moderate fibrosis', 'Severe fibrosis', 'Cirrhosis suspicion'];
    return {
      lsmKpa: 4.2 + seed * 2.1,
      capDbm: 220 + seed * 45,
      iqr: 0.8 + seed * 0.15,
      iqrMedianPercent: 18 + seed * 4,
      validMeasurements: 8 + seed,
      totalMeasurements: 10,
      successRatePercent: 80 + seed * 4,
      probeType: seed > 2 ? 'XL' : 'M',
      scanAt: new Date().toISOString(),
      operatorName: 'Demo Technician',
      deviceSerial,
      fastingStatus: true,
      bmi: 24.5 + seed,
      interpretation: interpretations[seed],
      steatosisGrade: `S${Math.min(seed, 3)}`,
      fibrosisStage: stages[seed],
      remarks: 'Dummy device data — replace with real Wi-Fi integration',
    };
  }

  async attachScanFile(orderId: string, fileMeta: { fileName: string; fileType: string }): Promise<{ fileId: string; url: string }> {
    return {
      fileId: `scan-file-${orderId.slice(0, 8)}`,
      url: `/mock/files/${fileMeta.fileName}`,
    };
  }
}

export const dummyFibrosisScanDeviceService = new DummyFibrosisScanDeviceService();
