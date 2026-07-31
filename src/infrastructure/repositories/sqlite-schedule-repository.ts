import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { ScheduleDetail, ScheduleItem } from '@/domain/schedules/schedule';
import type {
  CreateScheduleInput,
  ScheduleRepository,
} from '@/domain/schedules/schedule-repository';
import { assertValidInterval } from '@/domain/time/interval';

interface ScheduleRow {
  id: string;
  source: 'local' | 'eventkit';
  external_id: string | null;
  external_calendar_id: string | null;
  title: string;
  start_at: number;
  end_at: number;
  is_all_day: number;
  color_argb: string;
  occurrence_key: string | null;
  created_at: number;
  updated_at: number;
}

interface ScheduleDetailRow extends ScheduleRow {
  occurrence_status: 'occurred' | 'not-occurred' | null;
}

export class SqliteScheduleRepository implements ScheduleRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async listRange(startsAt: number, endsAt: number) {
    assertValidInterval({ startsAt, endsAt });
    const rows = await this.database.getAllAsync<ScheduleRow>(
      `
        SELECT *
        FROM schedule_items
        WHERE deleted_at IS NULL
          AND start_at < ?
          AND end_at > ?
        ORDER BY start_at ASC, end_at ASC
      `,
      endsAt,
      startsAt,
    );
    return rows.map(mapSchedule);
  }

  async getDetail(id: string) {
    const row = await this.database.getFirstAsync<ScheduleDetailRow>(
      `
        SELECT
          schedule_items.*,
          schedule_occurrence_overrides.status AS occurrence_status
        FROM schedule_items
        LEFT JOIN schedule_occurrence_overrides
          ON schedule_occurrence_overrides.schedule_id = schedule_items.id
          AND schedule_occurrence_overrides.occurrence_start_at = schedule_items.start_at
        WHERE schedule_items.id = ? AND schedule_items.deleted_at IS NULL
      `,
      id,
    );
    if (!row) return null;
    return {
      ...mapSchedule(row),
      isMarkedNotOccurred: row.occurrence_status === 'not-occurred',
    } satisfies ScheduleDetail;
  }

  async create(input: CreateScheduleInput) {
    assertValidInterval(input);
    const title = input.title.trim();
    if (!title) throw new Error('SCHEDULE_TITLE_REQUIRED');

    const id = Crypto.randomUUID();
    const now = Date.now();
    const item: ScheduleItem = {
      id,
      source: 'local',
      externalId: null,
      externalCalendarId: null,
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isAllDay: input.isAllDay ?? false,
      colorArgb: input.colorArgb ?? '#7C83FF',
      occurrenceKey: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.database.runAsync(
      `
        INSERT INTO schedule_items (
          id, source, title, start_at, end_at, is_all_day, color_argb, created_at, updated_at
        ) VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?)
      `,
      item.id,
      item.title,
      item.startsAt,
      item.endsAt,
      item.isAllDay ? 1 : 0,
      item.colorArgb,
      now,
      now,
    );
    return item;
  }

  async updateTime(id: string, startsAt: number, endsAt: number) {
    assertValidInterval({ startsAt, endsAt });
    await this.database.runAsync(
      `
        UPDATE schedule_items
        SET start_at = ?, end_at = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `,
      startsAt,
      endsAt,
      Date.now(),
      id,
    );
  }

  async markOccurrence(id: string, occurrenceStartsAt: number, occurred: boolean) {
    const now = Date.now();
    await this.database.runAsync(
      `
        INSERT INTO schedule_occurrence_overrides (
          schedule_id, occurrence_start_at, status, updated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(schedule_id, occurrence_start_at) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at
      `,
      id,
      occurrenceStartsAt,
      occurred ? 'occurred' : 'not-occurred',
      now,
    );
  }
}

function mapSchedule(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    externalCalendarId: row.external_calendar_id,
    title: row.title,
    startsAt: row.start_at,
    endsAt: row.end_at,
    isAllDay: row.is_all_day === 1,
    colorArgb: row.color_argb,
    occurrenceKey: row.occurrence_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
