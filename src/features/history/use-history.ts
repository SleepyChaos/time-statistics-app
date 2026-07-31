import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type {
  CreateBackfillInput,
  UpdateHistoryRecordInput,
} from '@/domain/history/history-repository';
import { SqliteHistoryRepository } from '@/infrastructure/repositories/sqlite-history-repository';

const trashQueryKey = ['history', 'trash'] as const;

export function useHistoryRecordDetail(recordId: string | null) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteHistoryRepository(database), [database]);
  return useQuery({
    queryKey: ['history', 'detail', recordId],
    queryFn: () => repository.getDetail(recordId as string),
    enabled: recordId !== null,
  });
}

export function useHistoryActions() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteHistoryRepository(database), [database]);
  const refreshTimeline = () => queryClient.invalidateQueries({ queryKey: ['timeline'] });
  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => repository.deleteRecord(recordId),
    onSuccess: async () => {
      await Promise.all([
        refreshTimeline(),
        queryClient.invalidateQueries({ queryKey: trashQueryKey }),
      ]);
    },
  });
  const prepareMutation = useMutation({
    mutationFn: (requestedAt: number) => repository.prepareBackfill(requestedAt),
  });
  const createMutation = useMutation({
    mutationFn: (input: CreateBackfillInput) => repository.createBackfill(input),
    onSuccess: refreshTimeline,
  });
  const updateMutation = useMutation({
    mutationFn: (input: UpdateHistoryRecordInput) => repository.updateRecord(input),
    onSuccess: async (_, input) => {
      await Promise.all([
        refreshTimeline(),
        queryClient.invalidateQueries({
          queryKey: ['history', 'detail', input.recordId],
        }),
      ]);
    },
  });

  return {
    deleteRecord: deleteMutation.mutate,
    prepareBackfill: prepareMutation.mutate,
    createBackfill: createMutation.mutate,
    updateRecord: updateMutation.mutate,
    isMutating:
      deleteMutation.isPending ||
      prepareMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending,
    error:
      deleteMutation.error ??
      prepareMutation.error ??
      createMutation.error ??
      updateMutation.error,
  };
}

export function useRecycleBin() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteHistoryRepository(database), [database]);
  const query = useQuery({
    queryKey: trashQueryKey,
    queryFn: () => repository.listTrash(),
  });
  const restoreMutation = useMutation({
    mutationFn: (recordId: string) => repository.restoreRecord(recordId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trashQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      ]);
    },
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    isRestoring: restoreMutation.isPending,
    error: query.error ?? restoreMutation.error,
    restore: restoreMutation.mutate,
  };
}
