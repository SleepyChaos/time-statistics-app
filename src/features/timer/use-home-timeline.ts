import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { SqliteTimelineRepository } from '@/infrastructure/repositories/sqlite-timeline-repository';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function useHomeTimeline(now: number) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteTimelineRepository(database), [database]);
  const minute = Math.floor(now / 60_000);
  return useQuery({
    queryKey: ['timeline', 'home', minute],
    queryFn: () =>
      repository.getSnapshot({
        displayWindow: { startsAt: now - SIX_HOURS, endsAt: now + SIX_HOURS },
        utilizationWindow: { startsAt: now - SIX_HOURS, endsAt: now },
        now,
      }),
  });
}
