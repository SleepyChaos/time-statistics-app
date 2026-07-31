import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { addLocalDays, startOfLocalDay } from '@/domain/time/local-day';
import { SqliteTimelineRepository } from '@/infrastructure/repositories/sqlite-timeline-repository';

export function useTimeline(rightDayStart: number, now: number) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteTimelineRepository(database), [database]);
  const leftDayStart = addLocalDays(rightDayStart, -1);
  const displayEnd = addLocalDays(rightDayStart, 1);
  const todayStart = startOfLocalDay(now);
  const utilizationStart = addLocalDays(todayStart, -1);
  const utilizationEnd = addLocalDays(todayStart, 1);

  return useQuery({
    queryKey: ['timeline', leftDayStart, displayEnd, Math.floor(now / 60_000)],
    queryFn: () =>
      repository.getSnapshot({
        displayWindow: { startsAt: leftDayStart, endsAt: displayEnd },
        utilizationWindow: { startsAt: utilizationStart, endsAt: utilizationEnd },
        now,
      }),
  });
}
