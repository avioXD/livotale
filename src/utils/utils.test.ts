import { isValidEmail, formatFullName } from '@/utils';

describe('utils', () => {
  it('validates email addresses', () => {
    expect(isValidEmail('test@livotel.com')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('formats full names', () => {
    expect(formatFullName('Jane', 'Doe')).toBe('Jane Doe');
  });
});
