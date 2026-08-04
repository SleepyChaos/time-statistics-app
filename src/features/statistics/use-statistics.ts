import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { statisticsPeriodMs, type StatisticsPeriod } from '@/domain/statistics/statistics';
import { SqliteStatisticsRepository } from '@/infrastructure/repositories/sqlite-statistics-repository';

export function useStatistics(period: StatisticsPeriod, endsAt: number) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteStatisticsRepository(database), [database]);
  const duration = statisticsPeriodMs(period);
  const startsAt = endsAt - duration;
  return useQuery({
    queryKey: ['statistics', period, Math.floor(endsAt / 60_000)],
    queryFn: () => repository.getSnapshot(startsAt, endsAt),
  });
}
