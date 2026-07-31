import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateTodoInput,
  TodoRepository,
} from '@/domain/todos/todo-repository';
import { compareTodos, type TodoItem, type TodoStage } from '@/domain/todos/todo';

interface TodoRow {
  id: string;
  source: 'local' | 'eventkit';
  external_id: string | null;
  external_list_id: string | null;
  stage: TodoStage;
  title: string;
  due_at: number | null;
  due_has_time: number;
  is_completed: number;
  recurrence_snapshot: string | null;
  priority: number;
  event_id: string | null;
  event_name: string | null;
  created_at: number;
  updated_at: number;
}

export class SqliteTodoRepository implements TodoRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async listIncomplete(stage?: TodoStage) {
    const rows = await this.database.getAllAsync<TodoRow>(
      `
        SELECT
          todo_items.*,
          todo_event_links.event_id,
          events.name AS event_name
        FROM todo_items
        LEFT JOIN todo_event_links ON todo_event_links.todo_id = todo_items.id
        LEFT JOIN events ON events.id = todo_event_links.event_id
        WHERE todo_items.deleted_at IS NULL
          AND todo_items.is_completed = 0
          AND (? IS NULL OR todo_items.stage = ?)
      `,
      stage ?? null,
      stage ?? null,
    );
    return rows.map(mapTodo).sort(compareTodos);
  }

  async create(input: CreateTodoInput) {
    const title = input.title.trim();
    if (!title) throw new Error('TODO_TITLE_REQUIRED');

    const id = Crypto.randomUUID();
    const now = Date.now();
    const stage = input.stage ?? 'buffer';
    await this.database.runAsync(
      `
        INSERT INTO todo_items (
          id, source, stage, title, due_at, due_has_time, created_at, updated_at
        ) VALUES (?, 'local', ?, ?, ?, ?, ?, ?)
      `,
      id,
      stage,
      title,
      input.dueAt ?? null,
      input.dueHasTime ? 1 : 0,
      now,
      now,
    );

    return {
      id,
      source: 'local' as const,
      externalId: null,
      externalListId: null,
      stage,
      title,
      dueAt: input.dueAt ?? null,
      dueHasTime: input.dueHasTime ?? false,
      isCompleted: false,
      recurrenceSnapshot: null,
      priority: 0,
      eventId: null,
      eventName: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async move(todoId: string, stage: TodoStage) {
    await this.database.runAsync(
      'UPDATE todo_items SET stage = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      stage,
      Date.now(),
      todoId,
    );
  }

  async setCompleted(todoId: string, isCompleted: boolean) {
    await this.database.runAsync(
      'UPDATE todo_items SET is_completed = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      isCompleted ? 1 : 0,
      Date.now(),
      todoId,
    );
  }

  async linkEvent(todoId: string, eventId: string | null) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      if (eventId === null) {
        await transaction.runAsync('DELETE FROM todo_event_links WHERE todo_id = ?', todoId);
        return;
      }

      const now = Date.now();
      await transaction.runAsync(
        `
          INSERT INTO todo_event_links (todo_id, event_id, created_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(todo_id) DO UPDATE SET
            event_id = excluded.event_id,
            updated_at = excluded.updated_at
        `,
        todoId,
        eventId,
        now,
        now,
      );
    });
  }
}

function mapTodo(row: TodoRow): TodoItem {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    externalListId: row.external_list_id,
    stage: row.stage,
    title: row.title,
    dueAt: row.due_at,
    dueHasTime: row.due_has_time === 1,
    isCompleted: row.is_completed === 1,
    recurrenceSnapshot: row.recurrence_snapshot,
    priority: row.priority,
    eventId: row.event_id,
    eventName: row.event_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

