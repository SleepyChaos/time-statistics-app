import type { TodoItem, TodoStage } from '@/domain/todos/todo';

export interface CreateTodoInput {
  title: string;
  stage?: TodoStage;
  dueAt?: number | null;
  dueHasTime?: boolean;
}

export interface TodoRepository {
  listIncomplete(stage?: TodoStage): Promise<TodoItem[]>;
  create(input: CreateTodoInput): Promise<TodoItem>;
  move(todoId: string, stage: TodoStage): Promise<void>;
  setCompleted(todoId: string, isCompleted: boolean): Promise<void>;
  linkEvent(todoId: string, eventId: string | null): Promise<void>;
}

