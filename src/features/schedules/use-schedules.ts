import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CreateScheduleInput } from '@/domain/schedules/schedule-repository';
import { SqliteScheduleRepository } from '@/infrastructure/repositories/sqlite-schedule-repository';

export function useScheduleDetail(scheduleId: string | null) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteScheduleRepository(database), [database]);
  return useQuery({
    queryKey: ['schedule', 'detail', scheduleId],
    queryFn: () => repository.getDetail(scheduleId as string),
    enabled: scheduleId !== null,
  });
}

export function useScheduleActions() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteScheduleRepository(database), [database]);
  const refreshTimeline = () => queryClient.invalidateQueries({ queryKey: ['timeline'] });
  const createMutation = useMutation({
    mutationFn: (input: CreateScheduleInput) => repository.create(input),
    onSuccess: refreshTimeline,
  });
  const occurrenceMutation = useMutation({
    mutationFn: ({
      id,
      occurrenceStartsAt,
      occurred,
    }: {
      id: string;
      occurrenceStartsAt: number;
      occurred: boolean;
    }) => repository.markOccurrence(id, occurrenceStartsAt, occurred),
    onSuccess: async (_, input) => {
      await Promise.all([
        refreshTimeline(),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'detail', input.id] }),
      ]);
    },
  });
  const updateTimeMutation = useMutation({
    mutationFn: ({ id, startsAt, endsAt }: { id: string; startsAt: number; endsAt: number }) =>
      repository.updateTime(id, startsAt, endsAt),
    onSuccess: async (_, input) => {
      await Promise.all([
        refreshTimeline(),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'detail', input.id] }),
      ]);
    },
  });

  return {
    create: createMutation.mutate,
    markOccurrence: occurrenceMutation.mutate,
    updateTime: updateTimeMutation.mutate,
    isMutating:
      createMutation.isPending || occurrenceMutation.isPending || updateTimeMutation.isPending,
    error: createMutation.error ?? occurrenceMutation.error ?? updateTimeMutation.error,
  };
}
