import { countActiveFilters } from './listFilters';

describe('countActiveFilters', () => {
  const defaults = { status: '', source: '' };

  it('returns 0 when nothing applied', () => {
    expect(countActiveFilters(defaults, defaults)).toBe(0);
  });

  it('counts search', () => {
    expect(countActiveFilters(defaults, defaults, 'foo')).toBe(1);
  });

  it('counts non-default filter fields', () => {
    expect(countActiveFilters({ status: 'new', source: '' }, defaults)).toBe(1);
  });
});
