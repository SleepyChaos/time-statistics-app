import { aggregateCategories, statisticsPeriodMs } from './statistics';

describe('statistics windows', () => {
  it('uses rolling 24 hour, 7 day and 30 day windows', () => {
    expect(statisticsPeriodMs('day')).toBe(86_400_000);
    expect(statisticsPeriodMs('week')).toBe(7 * 86_400_000);
    expect(statisticsPeriodMs('month')).toBe(30 * 86_400_000);
  });

  it('aggregates event totals by category and sorts descending', () => {
    const categories = aggregateCategories([
      { eventId: 'a', eventName: 'A', eventColorArgb: '#000000', categoryId: 'study', categoryName: '学习', effectiveMs: 20 },
      { eventId: 'b', eventName: 'B', eventColorArgb: '#000000', categoryId: 'study', categoryName: '学习', effectiveMs: 30 },
      { eventId: 'c', eventName: 'C', eventColorArgb: '#000000', categoryId: 'life', categoryName: '生活', effectiveMs: 10 },
    ]);
    expect(categories.map((item) => [item.categoryId, item.effectiveMs])).toEqual([
      ['study', 50],
      ['life', 10],
    ]);
  });
});
