import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateCategoryInput,
  CreateEventInput,
  EventRepository,
} from '@/domain/events/event-repository';
import type { EventCategory, TrackingEvent } from '@/domain/events/event';

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
  is_system: number;
  deleted_at: number | null;
}

interface EventRow {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  color_argb: string;
  sort_order: number;
  deleted_at: number | null;
}

export class SqliteEventRepository implements EventRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async listCategories() {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT id, name, sort_order, is_system, deleted_at
       FROM event_categories
       WHERE deleted_at IS NULL
       ORDER BY sort_order, created_at`,
    );
    return rows.map(mapCategory);
  }

  async listActiveEvents() {
    const rows = await this.database.getAllAsync<EventRow>(
      `SELECT
         events.id,
         events.category_id,
         event_categories.name AS category_name,
         events.name,
         events.color_argb,
         events.sort_order,
         events.deleted_at
       FROM events
       JOIN event_categories ON event_categories.id = events.category_id
       WHERE events.deleted_at IS NULL AND event_categories.deleted_at IS NULL
       ORDER BY event_categories.sort_order, events.sort_order, events.created_at`,
    );
    return rows.map(mapEvent);
  }

  async createCategory(input: CreateCategoryInput) {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new Error('CATEGORY_NAME_REQUIRED');
    }

    const id = Crypto.randomUUID();
    const now = Date.now();
    const row = await this.database.getFirstAsync<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM event_categories WHERE deleted_at IS NULL`,
    );
    const sortOrder = row?.next_order ?? 0;
    await this.database.runAsync(
      `INSERT INTO event_categories (
        id, name, sort_order, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, ?)`,
      id,
      name,
      sortOrder,
      now,
      now,
    );
    return {
      id,
      name,
      sortOrder,
      isSystem: false,
      deletedAt: null,
    } satisfies EventCategory;
  }

  async createEvent(input: CreateEventInput) {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new Error('EVENT_NAME_REQUIRED');
    }
    if (!/^#[0-9A-F]{6}$/i.test(input.colorArgb)) {
      throw new Error('INVALID_EVENT_COLOR');
    }

    const category = await this.database.getFirstAsync<{ name: string }>(
      `SELECT name FROM event_categories
       WHERE id = ? AND deleted_at IS NULL`,
      input.categoryId,
    );
    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    const orderRow = await this.database.getFirstAsync<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM events WHERE category_id = ? AND deleted_at IS NULL`,
      input.categoryId,
    );
    const id = Crypto.randomUUID();
    const now = Date.now();
    const sortOrder = orderRow?.next_order ?? 0;
    await this.database.runAsync(
      `INSERT INTO events (
        id, category_id, name, color_argb, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.categoryId,
      name,
      input.colorArgb.toUpperCase(),
      sortOrder,
      now,
      now,
    );

    return {
      id,
      categoryId: input.categoryId,
      categoryName: category.name,
      name,
      colorArgb: input.colorArgb.toUpperCase(),
      sortOrder,
      deletedAt: null,
    } satisfies TrackingEvent;
  }
}

function mapCategory(row: CategoryRow): EventCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isSystem: row.is_system === 1,
    deletedAt: row.deleted_at,
  };
}

function mapEvent(row: EventRow): TrackingEvent {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    colorArgb: row.color_argb,
    sortOrder: row.sort_order,
    deletedAt: row.deleted_at,
  };
}
