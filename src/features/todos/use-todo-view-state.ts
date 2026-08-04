import { useMutation, useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import type { TodoStage } from '@/domain/todos/todo';

export type TodoStageFilter = TodoStage | 'all';

interface TodoViewState {
  filter: TodoStageFilter;
  scrollY: number;
}

const DEFAULT_STATE: TodoViewState = { filter: 'all', scrollY: 0 };
const VALID_FILTERS = new Set<TodoStageFilter>([
  'all',
  'habit',
  'buffer',
  'doing',
  'future',
  'unclassified',
]);

export function useTodoViewState() {
  const database = useSQLiteContext();
  const query = useQuery({
    queryKey: ['todos', 'view-state'],
    queryFn: async () => {
      const row = await database.getFirstAsync<{ value_json: string }>(
        `SELECT value_json FROM app_settings WHERE key = 'todoViewState'`,
      );
      if (!row) return DEFAULT_STATE;
      try {
        const value = JSON.parse(row.value_json) as Partial<TodoViewState>;
        return {
          filter: value.filter && VALID_FILTERS.has(value.filter) ? value.filter : 'all',
          scrollY: typeof value.scrollY === 'number' && value.scrollY >= 0 ? value.scrollY : 0,
        } satisfies TodoViewState;
      } catch {
        return DEFAULT_STATE;
      }
    },
  });
  const mutation = useMutation({
    mutationFn: (value: TodoViewState) =>
      database.runAsync(
        `INSERT INTO app_settings (key, value_json, updated_at) VALUES ('todoViewState', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
        JSON.stringify(value),
        Date.now(),
      ),
  });
  return { state: query.data, isLoading: query.isLoading, save: mutation.mutate };
}
