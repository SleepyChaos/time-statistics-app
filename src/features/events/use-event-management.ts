import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type {
  CreateCategoryInput,
  CreateEventInput,
  UpdateCategoryInput,
  UpdateEventInput,
} from '@/domain/events/event-repository';
import { SqliteEventRepository } from '@/infrastructure/repositories/sqlite-event-repository';
import { activeEventsQueryKey } from '@/features/events/use-active-events';

export const eventManagementQueryKey = ['events', 'management'] as const;

export function useEventManagement() {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteEventRepository(database), [database]);
  const query = useQuery({
    queryKey: eventManagementQueryKey,
    queryFn: async () => {
      const [categories, events] = await Promise.all([
        repository.listAllCategories(),
        repository.listAllEvents(),
      ]);
      return { categories, events };
    },
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventManagementQueryKey }),
      queryClient.invalidateQueries({ queryKey: activeEventsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['todos', 'incomplete'] }),
    ]);
  };
  const createCategory = useMutation({
    mutationFn: (input: CreateCategoryInput) => repository.createCategory(input),
    onSuccess: invalidate,
  });
  const createEvent = useMutation({
    mutationFn: (input: CreateEventInput) => repository.createEvent(input),
    onSuccess: invalidate,
  });
  const updateCategory = useMutation({
    mutationFn: (input: UpdateCategoryInput) => repository.updateCategory(input),
    onSuccess: invalidate,
  });
  const updateEvent = useMutation({
    mutationFn: (input: UpdateEventInput) => repository.updateEvent(input),
    onSuccess: invalidate,
  });
  const moveCategory = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 1 }) =>
      repository.moveCategory(id, direction),
    onSuccess: invalidate,
  });
  const moveEvent = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 1 }) =>
      repository.moveEvent(id, direction),
    onSuccess: invalidate,
  });

  return {
    categories: query.data?.categories ?? [],
    events: query.data?.events ?? [],
    isLoading: query.isLoading,
    isMutating:
      createCategory.isPending ||
      createEvent.isPending ||
      updateCategory.isPending ||
      updateEvent.isPending ||
      moveCategory.isPending ||
      moveEvent.isPending,
    error:
      query.error ??
      createCategory.error ??
      createEvent.error ??
      updateCategory.error ??
      updateEvent.error ??
      moveCategory.error ??
      moveEvent.error,
    createCategory: createCategory.mutate,
    createEvent: createEvent.mutate,
    updateCategory: updateCategory.mutate,
    updateEvent: updateEvent.mutate,
    moveCategory: moveCategory.mutate,
    moveEvent: moveEvent.mutate,
  };
}
