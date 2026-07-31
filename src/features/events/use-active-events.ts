import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { SqliteEventRepository } from '@/infrastructure/repositories/sqlite-event-repository';

export const activeEventsQueryKey = ['events', 'active'] as const;

export function useActiveEvents() {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteEventRepository(database), [database]);

  return useQuery({
    queryKey: activeEventsQueryKey,
    queryFn: () => repository.listActiveEvents(),
  });
}
