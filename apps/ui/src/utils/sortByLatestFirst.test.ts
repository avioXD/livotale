import { getLatestRowTimestamp, sortByLatestFirst } from './sortByLatestFirst';

describe('sortByLatestFirst', () => {
  it('prefers updatedAt over createdAt', () => {
    expect(
      getLatestRowTimestamp({
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      }),
    ).toBe(new Date('2024-06-01T00:00:00Z').getTime());
  });

  it('sorts rows newest-first', () => {
    const sorted = sortByLatestFirst([
      { id: 'old', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'new', updatedAt: '2024-06-01T00:00:00Z' },
      { id: 'mid', createdAt: '2024-03-01T00:00:00Z' },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['new', 'mid', 'old']);
  });
});
