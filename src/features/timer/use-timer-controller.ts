import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import {
  type StartTimerInput,
  SqliteTimerEngine,
} from '@/application/timer-engine/sqlite-timer-engine';

export const activeTimerQueryKey = ['timer', 'active'] as const;

export function useTimerController() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const engine = useMemo(() => new SqliteTimerEngine(database), [database]);
  const activeQuery = useQuery({
    queryKey: activeTimerQueryKey,
    queryFn: () => engine.getActive(),
  });

  const refreshActive = async () => {
    await queryClient.invalidateQueries({ queryKey: activeTimerQueryKey });
  };
  const refreshAfterFinalize = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: activeTimerQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['todos', 'incomplete'] }),
    ]);
  };

  const startMutation = useMutation({
    mutationFn: (input: StartTimerInput) => engine.start(input),
    onSuccess: refreshActive,
  });
  const pauseMutation = useMutation({
    mutationFn: () => engine.pause(),
    onSuccess: refreshActive,
  });
  const resumeMutation = useMutation({
    mutationFn: () => engine.resume(),
    onSuccess: refreshActive,
  });
  const requestEndMutation = useMutation({
    mutationFn: () => engine.requestEnd(),
    onSuccess: refreshActive,
  });
  const saveMutation = useMutation({
    mutationFn: ({
      reflection,
      completeTodo,
    }: {
      reflection: string;
      completeTodo: boolean;
    }) => engine.endAndSave(reflection, completeTodo),
    onSuccess: refreshAfterFinalize,
  });
  const discardMutation = useMutation({
    mutationFn: () => engine.endAndDiscard(),
    onSuccess: refreshAfterFinalize,
  });

  const error =
    startMutation.error ??
    pauseMutation.error ??
    resumeMutation.error ??
    requestEndMutation.error ??
    saveMutation.error ??
    discardMutation.error;

  return {
    activeTimer: activeQuery.data ?? null,
    isLoading: activeQuery.isLoading,
    isMutating:
      startMutation.isPending ||
      pauseMutation.isPending ||
      resumeMutation.isPending ||
      requestEndMutation.isPending ||
      saveMutation.isPending ||
      discardMutation.isPending,
    error,
    start: startMutation.mutate,
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    requestEnd: requestEndMutation.mutate,
    save: saveMutation.mutate,
    discard: discardMutation.mutate,
  };
}
