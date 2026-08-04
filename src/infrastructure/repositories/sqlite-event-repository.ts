import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateCategoryInput,
  CreateEventInput,
  EventRepository,
  UpdateCategoryInput,
  UpdateEventInput,
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
    return this.loadCategories(false);
  }

  async listAllCategories() {
    return this.loadCategories(true);
  }

  private async loadCategories(includeDeleted: boolean) {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT id, name, sort_order, is_system, deleted_at
       FROM event_categories
       WHERE (? = 1 OR deleted_at IS NULL)
       ORDER BY sort_order, created_at`,
      includeDeleted ? 1 : 0,
    );
    return rows.map(mapCategory);
  }

  async listActiveEvents() {
    return this.loadEvents(false);
  }

  async listAllEvents() {
    return this.loadEvents(true);
  }

  private async loadEvents(includeDeleted: boolean) {
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
       WHERE (? = 1 OR (events.deleted_at IS NULL AND event_categories.deleted_at IS NULL))
       ORDER BY event_categories.sort_order, events.sort_order, events.created_at`,
      includeDeleted ? 1 : 0,
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


  async updateCategory(input: UpdateCategoryInput) {
    const current = await this.database.getFirstAsync<CategoryRow>(
      `SELECT id, name, sort_order, is_system, deleted_at FROM event_categories WHERE id = ?`,
      input.id,
    );
    if (!current) throw new Error('CATEGORY_NOT_FOUND');
    const name = input.name === undefined ? current.name : input.name.trim();
    if (!name) throw new Error('CATEGORY_NAME_REQUIRED');
    const deletedAt = input.deleted === undefined
      ? current.deleted_at
      : input.deleted ? Date.now() : null;
    const now = Date.now();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE event_categories SET name = ?, sort_order = ?, deleted_at = ?, updated_at = ? WHERE id = ?`,
        name,
        input.sortOrder ?? current.sort_order,
        deletedAt,
        now,
        input.id,
      );
      if (input.deleted === true) {
        await transaction.runAsync(
          `DELETE FROM todo_event_links WHERE event_id IN (SELECT id FROM events WHERE category_id = ?)`,
          input.id,
        );
      }
    });
  }

  async updateEvent(input: UpdateEventInput) {
    const current = await this.database.getFirstAsync<EventRow>(
      `SELECT events.id, events.category_id, event_categories.name AS category_name,
              events.name, events.color_argb, events.sort_order, events.deleted_at
       FROM events JOIN event_categories ON event_categories.id = events.category_id
       WHERE events.id = ?`,
      input.id,
    );
    if (!current) throw new Error('EVENT_NOT_FOUND');
    const name = input.name === undefined ? current.name : input.name.trim();
    const color = input.colorArgb === undefined ? current.color_argb : input.colorArgb.toUpperCase();
    if (!name) throw new Error('EVENT_NAME_REQUIRED');
    if (!/^#[0-9A-F]{6}$/i.test(color)) throw new Error('INVALID_EVENT_COLOR');
    const deletedAt = input.deleted === undefined
      ? current.deleted_at
      : input.deleted ? Date.now() : null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE events SET name = ?, color_argb = ?, sort_order = ?, deleted_at = ?, updated_at = ? WHERE id = ?`,
        name,
        color,
        input.sortOrder ?? current.sort_order,
        deletedAt,
        Date.now(),
        input.id,
      );
      if (input.deleted === true) {
        await transaction.runAsync('DELETE FROM todo_event_links WHERE event_id = ?', input.id);
      }
    });
  }

  async moveCategory(id: string, direction: -1 | 1) {
    await this.moveOrderedItem('event_categories', id, direction);
  }

  async moveEvent(id: string, direction: -1 | 1) {
    const event = await this.database.getFirstAsync<{ category_id: string }>(
      'SELECT category_id FROM events WHERE id = ?',
      id,
    );
    if (!event) throw new Error('EVENT_NOT_FOUND');
    await this.moveOrderedItem('events', id, direction, event.category_id);
  }

  private async moveOrderedItem(
    table: 'event_categories' | 'events',
    id: string,
    direction: -1 | 1,
    categoryId?: string,
  ) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const current = await transaction.getFirstAsync<{ sort_order: number }>(
        `SELECT sort_order FROM ${table} WHERE id = ?`,
        id,
      );
      if (!current) throw new Error('EVENT_ITEM_NOT_FOUND');
      const comparator = direction < 0 ? '<' : '>';
      const ordering = direction < 0 ? 'DESC' : 'ASC';
      const neighbor = await transaction.getFirstAsync<{ id: string; sort_order: number }>(
        `SELECT id, sort_order FROM ${table}
         WHERE deleted_at IS NULL AND sort_order ${comparator} ?
           ${categoryId ? 'AND category_id = ?' : ''}
         ORDER BY sort_order ${ordering} LIMIT 1`,
        ...(categoryId ? [current.sort_order, categoryId] : [current.sort_order]),
      );
      if (!neighbor) return;
      const now = Date.now();
      await transaction.runAsync(
        `UPDATE ${table} SET sort_order = ?, updated_at = ? WHERE id = ?`,
        neighbor.sort_order,
        now,
        id,
      );
      await transaction.runAsync(
        `UPDATE ${table} SET sort_order = ?, updated_at = ? WHERE id = ?`,
        current.sort_order,
        now,
        neighbor.id,
      );
    });
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
