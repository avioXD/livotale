import { paginateList } from './pagination';

describe('paginateList', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns empty slice for empty list', () => {
    const result = paginateList([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });

  it('clamps page when beyond total pages', () => {
    const result = paginateList(items, 99, 10);
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(5);
  });
});
