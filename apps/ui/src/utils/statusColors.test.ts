import {
  getAiExtractionStatusVariant,
  getAppointmentStatusVariant,
  getConsentStatusVariant,
  getEnquiryStatusVariant,
  getOrderStatusVariant,
  getPaymentStatusVariant,
  resolveGenericStatusVariant,
} from './statusColors';

describe('statusColors', () => {
  it('maps terminal order states', () => {
    expect(getOrderStatusVariant('completed')).toBe('success');
    expect(getOrderStatusVariant('cancelled')).toBe('destructive');
    expect(getOrderStatusVariant('payment_pending')).toBe('warning');
    expect(getOrderStatusVariant('scan_in_progress')).toBe('default');
  });

  it('maps payment states', () => {
    expect(getPaymentStatusVariant('success')).toBe('success');
    expect(getPaymentStatusVariant('failed')).toBe('destructive');
    expect(getPaymentStatusVariant('pending')).toBe('warning');
  });

  it('maps appointment states', () => {
    expect(getAppointmentStatusVariant('completed')).toBe('success');
    expect(getAppointmentStatusVariant('no_show')).toBe('destructive');
    expect(getAppointmentStatusVariant('in_progress')).toBe('default');
  });

  it('maps AI extraction states', () => {
    expect(getAiExtractionStatusVariant('verified')).toBe('success');
    expect(getAiExtractionStatusVariant('review_pending')).toBe('warning');
    expect(getAiExtractionStatusVariant('failed')).toBe('destructive');
  });

  it('maps enquiry CRM states', () => {
    expect(getEnquiryStatusVariant('new')).toBe('default');
    expect(getEnquiryStatusVariant('converted')).toBe('success');
    expect(getEnquiryStatusVariant('follow_up_required')).toBe('warning');
  });

  it('maps consent acceptance', () => {
    expect(getConsentStatusVariant(true)).toBe('success');
    expect(getConsentStatusVariant(false)).toBe('warning');
  });

  it('falls back generically for unknown statuses', () => {
    expect(resolveGenericStatusVariant('something_failed')).toBe('destructive');
    expect(resolveGenericStatusVariant('awaiting_review')).toBe('warning');
    expect(resolveGenericStatusVariant('random_value')).toBe('secondary');
  });
});
