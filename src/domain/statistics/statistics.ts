export type StatisticsPeriod = 'day' | 'week' | 'month';

export interface EventTimeStatistic {
  eventId: string;
  eventName: string;
  eventColorArgb: string;
  categoryId: string;
  categoryName: string;
  effectiveMs: number;
  trendMs: number[];
}

export interface CategoryTimeStatistic {
  categoryId: string;
  categoryName: string;
  effectiveMs: number;
  trendMs: number[];
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
      trendMs: event.trendMs.map((value, index) => value + (current?.trendMs[index] ?? 0)),
    });
  }
  return [...totals.values()].sort((left, right) => right.effectiveMs - left.effectiveMs);
}

export function attachEventTrends(
  events: readonly EventTimeStatistic[],
  slices: readonly { eventId: string; startsAt: number; endsAt: number }[],
  startsAt: number,
  endsAt: number,
  bucketCount = 7,
) {
  const bucketDuration = (endsAt - startsAt) / bucketCount;
  const trends = new Map(events.map((event) => [event.eventId, Array<number>(bucketCount).fill(0)]));
  for (const slice of slices) {
    const points = trends.get(slice.eventId);
    if (!points) continue;
    for (let index = 0; index < bucketCount; index += 1) {
      const bucketStartsAt = startsAt + bucketDuration * index;
      const bucketEndsAt = bucketStartsAt + bucketDuration;
      points[index] += Math.max(
        0,
        Math.min(slice.endsAt, bucketEndsAt) - Math.max(slice.startsAt, bucketStartsAt),
      );
    }
  }
  return events.map((event) => ({ ...event, trendMs: trends.get(event.eventId) ?? [] }));
}
