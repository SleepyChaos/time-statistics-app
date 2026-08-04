export type StatisticsPeriod = 'day' | 'week' | 'month';

export interface EventTimeStatistic {
  eventId: string;
  eventName: string;
  eventColorArgb: string;
  categoryId: string;
  categoryName: string;
  effectiveMs: number;
}

export interface CategoryTimeStatistic {
  categoryId: string;
  categoryName: string;
  effectiveMs: number;
}

export interface TodoTimeStatistic {
  todoId: string;
  title: string;
  effectiveMs: number;
  recordCount: number;
  firstStartedAt: number;
  lastStartedAt: number;
  averageEffectiveMs: number;
}

export interface StatisticsSnapshot {
  startsAt: number;
  endsAt: number;
  utilization: { effectiveMs: number; elapsedMs: number; ratio: number };
  previousUtilizationRatio: number;
  categories: CategoryTimeStatistic[];
  events: EventTimeStatistic[];
  todos: TodoTimeStatistic[];
}

export function statisticsPeriodMs(period: StatisticsPeriod) {
  if (period === 'day') return 24 * 60 * 60 * 1000;
  if (period === 'week') return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

export function aggregateCategories(events: readonly EventTimeStatistic[]) {
  const totals = new Map<string, CategoryTimeStatistic>();
  for (const event of events) {
    const current = totals.get(event.categoryId);
    totals.set(event.categoryId, {
      categoryId: event.categoryId,
      categoryName: event.categoryName,
      effectiveMs: (current?.effectiveMs ?? 0) + event.effectiveMs,
    });
  }
  return [...totals.values()].sort((left, right) => right.effectiveMs - left.effectiveMs);
}
