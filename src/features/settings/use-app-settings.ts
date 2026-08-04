import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { AppPreferenceKey, AppPreferences } from '@/domain/settings/app-settings';
import { SqliteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings-repository';

export const appSettingsQueryKey = ['settings', 'preferences'] as const;

export function useAppSettings() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteSettingsRepository(database), [database]);
  const query = useQuery({ queryKey: appSettingsQueryKey, queryFn: () => repository.getPreferences() });
  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: AppPreferenceKey; value: AppPreferences[AppPreferenceKey] }) =>
      repository.setPreference(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appSettingsQueryKey }),
  });
  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isMutating: mutation.isPending,
    error: query.error ?? mutation.error,
    setPreference: mutation.mutate,
  };
}

export function useDataSummary() {
  const database = useSQLiteContext();
  const repository = useMemo(() => new SqliteSettingsRepository(database), [database]);
  return useQuery({ queryKey: ['settings', 'data-summary'], queryFn: () => repository.getDataSummary() });
}
