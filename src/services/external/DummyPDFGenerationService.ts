import type { IPDFGenerationService, PDFGenerationResult } from './types';

export class DummyPDFGenerationService implements IPDFGenerationService {
  private generate(type: string, id: string): PDFGenerationResult {
    const ts = Date.now();
    return {
      fileId: `pdf-${type}-${ts}`,
      url: `/mock/pdf/${type}/${id}.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateReportPdf(templateId: string, data: Record<string, unknown>): Promise<PDFGenerationResult> {
    return this.generate('report', String(data.orderId ?? templateId));
  }

  async generatePrescriptionPdf(templateId: string, data: Record<string, unknown>): Promise<PDFGenerationResult> {
    return this.generate('prescription', String(data.prescriptionId ?? templateId));
  }

  async generateInvoicePdf(data: Record<string, unknown>): Promise<PDFGenerationResult> {
    return this.generate('invoice', String(data.orderId ?? 'inv'));
  }
}

export const dummyPDFGenerationService = new DummyPDFGenerationService();
