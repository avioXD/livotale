import { paginateList } from '@/utils/pagination';

describe('useStorePaged contract', () => {
  it('paginateList updates slice when page changes', () => {
    const items = Array.from({ length: 25 }, (_, i) => `row-${i + 1}`);
    const page1 = paginateList(items, 1, 10);
    const page2 = paginateList(items, 2, 10);

    expect(page1.items[0]).toBe('row-1');
    expect(page2.items[0]).toBe('row-11');
    expect(page1.page).toBe(1);
    expect(page2.page).toBe(2);
  });
});
