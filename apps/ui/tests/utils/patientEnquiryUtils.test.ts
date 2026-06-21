import { isOpenPatientEnquiry, enquiryMessagePreview } from '@/utils/patientEnquiryUtils';
import type { PatientEnquiry } from '@/types/patientPortal';

describe('patientEnquiryUtils', () => {
  const base: PatientEnquiry = {
    id: 'e1',
    enquiryNumber: 'ENQ-001',
    status: 'new',
    patientStatusLabel: 'Submitted',
    enquiryAt: '2026-01-15T10:00:00Z',
  };

  it('treats new enquiries as open', () => {
    expect(isOpenPatientEnquiry(base)).toBe(true);
  });

  it('treats converted enquiries as closed', () => {
    expect(isOpenPatientEnquiry({ ...base, status: 'converted' })).toBe(false);
  });

  it('truncates long message previews', () => {
    const long = 'a'.repeat(150);
    expect(enquiryMessagePreview(long)?.endsWith('…')).toBe(true);
    expect(enquiryMessagePreview('  hello  ')).toBe('hello');
  });
});
