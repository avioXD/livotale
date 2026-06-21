import { isScanCaptureComplete } from '@/app/pages/shared/components/fibroScanKpiConfig';

describe('isScanCaptureComplete', () => {
  it('returns true when KPI is a string decimal and report proof URL is present', () => {
    expect(
      isScanCaptureComplete({
        source: 'manual',
        liverStiffnessKpa: '6.2' as unknown as number,
        scanFileUrl: 'https://storage.test/report.pdf',
      }),
    ).toBe(true);
  });

  it('returns false when report proof URL is missing', () => {
    expect(
      isScanCaptureComplete({
        source: 'manual',
        liverStiffnessKpa: 6.2,
        scanFileUrl: null,
      }),
    ).toBe(false);
  });

  it('returns false when liver stiffness is not numeric', () => {
    expect(
      isScanCaptureComplete({
        source: 'manual',
        liverStiffnessKpa: Number.NaN,
        scanFileUrl: 'https://storage.test/report.pdf',
      }),
    ).toBe(false);
  });
});
