import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CreateTodoInput } from '@/domain/todos/todo-repository';
import type { TodoStage } from '@/domain/todos/todo';
import { SqliteTodoRepository } from '@/infrastructure/repositories/sqlite-todo-repository';

const todosQueryKey = ['todos', 'incomplete'] as const;

export function useTodos(stage?: TodoStage) {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SqliteTodoRepository(database), [database]);
  const query = useQuery({
    queryKey: [...todosQueryKey, stage ?? 'all'],
    queryFn: () => repository.listIncomplete(stage),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: todosQueryKey });
  const createMutation = useMutation({
    mutationFn: (input: CreateTodoInput) => repository.create(input),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: (todoId: string) => repository.setCompleted(todoId, true),
    onSuccess: invalidate,
  });
  const linkMutation = useMutation({
    mutationFn: ({ todoId, eventId }: { todoId: string; eventId: string | null }) =>
      repository.linkEvent(todoId, eventId),
    onSuccess: invalidate,
  });

  return {
    todos: query.data ?? [],
    isLoading: query.isLoading,
    isMutating:
      createMutation.isPending || completeMutation.isPending || linkMutation.isPending,
    error: query.error ?? createMutation.error ?? completeMutation.error ?? linkMutation.error,
    create: createMutation.mutate,
    complete: completeMutation.mutate,
    linkEvent: linkMutation.mutate,
  };
}
