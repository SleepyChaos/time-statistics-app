import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import {
  type StartTimerInput,
  SqliteTimerEngine,
} from '@/application/timer-engine/sqlite-timer-engine';
import { PomodoroNotificationScheduler } from '@/infrastructure/notifications/pomodoro-notifications';

export const activeTimerQueryKey = ['timer', 'active'] as const;

export function useTimerController() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const engine = useMemo(() => new SqliteTimerEngine(database), [database]);
  const notificationScheduler = useMemo(
    () => new PomodoroNotificationScheduler(database),
    [database],
  );
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
    onSuccess: async (active) => {
      await Promise.all([refreshActive(), notificationScheduler.schedule(active)]);
    },
  });
  const pauseMutation = useMutation({
    mutationFn: () => engine.pause(),
    onSuccess: async () => {
      await Promise.all([refreshActive(), notificationScheduler.cancel()]);
    },
  });
  const resumeMutation = useMutation({
    mutationFn: () => engine.resume(),
    onSuccess: async (active) => {
      await Promise.all([refreshActive(), notificationScheduler.schedule(active)]);
    },
  });
  const switchEventMutation = useMutation({
    mutationFn: (eventId: string) => engine.switchEvent(eventId),
    onSuccess: async () => {
      await Promise.all([
        refreshActive(),
        queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      ]);
    },
  });
  const advancePomodoroMutation = useMutation({
    mutationFn: () => engine.advancePomodoroPhase(),
    onSuccess: async (active) => {
      await Promise.all([refreshActive(), notificationScheduler.schedule(active)]);
    },
  });
  const requestEndMutation = useMutation({
    mutationFn: () => engine.requestEnd(),
    onSuccess: async () => {
      await Promise.all([refreshActive(), notificationScheduler.cancel()]);
    },
  });
  const saveMutation = useMutation({
    mutationFn: ({
      reflection,
      completeTodo,
    }: {
      reflection: string;
      completeTodo: boolean;
    }) => engine.endAndSave(reflection, completeTodo),
    onSuccess: async () => {
      await Promise.all([refreshAfterFinalize(), notificationScheduler.cancel()]);
    },
  });
  const discardMutation = useMutation({
    mutationFn: () => engine.endAndDiscard(),
    onSuccess: async () => {
      await Promise.all([refreshAfterFinalize(), notificationScheduler.cancel()]);
    },
  });

  const error =
    startMutation.error ??
    pauseMutation.error ??
    resumeMutation.error ??
    switchEventMutation.error ??
    advancePomodoroMutation.error ??
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
      switchEventMutation.isPending ||
      advancePomodoroMutation.isPending ||
      requestEndMutation.isPending ||
      saveMutation.isPending ||
      discardMutation.isPending,
    error,
    start: startMutation.mutate,
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    switchEvent: switchEventMutation.mutate,
    advancePomodoro: advancePomodoroMutation.mutate,
    requestEnd: requestEndMutation.mutate,
    save: saveMutation.mutate,
    discard: discardMutation.mutate,
  };
}
