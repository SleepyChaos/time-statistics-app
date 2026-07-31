import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  TRASH_RETENTION_MS,
  buildBackfillRange,
  cropSlicesToRange,
  trashExpiresAt,
  type HistoryRecordDetail,
  type TrashedRecord,
} from '@/domain/history/history-record';
import type {
  CreateBackfillInput,
  HistoryRepository,
  UpdateHistoryRecordInput,
} from '@/domain/history/history-repository';
import type { TimeSliceKind, TimerMode } from '@/domain/timer/active-timer';
import type { TimelineDragTarget } from '@/domain/timeline/timeline-edit';
import { purgeExpiredRecords } from '@/infrastructure/database/maintenance';

interface DetailRow {
  record_id: string;
  session_id: string;
  mode: TimerMode;
  event_id: string;
  event_name_snapshot: string;
  event_color_snapshot: string;
  todo_title_snapshot: string | null;
  started_at: number;
  ended_at: number;
  reflection: string | null;
  effective_ms: number;
  paused_ms: number;
}

interface TrashRow {
  record_id: string;
  event_name_snapshot: string;
  event_color_snapshot: string;
  started_at: number;
  ended_at: number;
  deleted_at: number;
}

interface EventRow {
  id: string;
  name: string;
  color_argb: string;
}

interface EditableSliceRow {
  id: string;
  kind: TimeSliceKind;
  started_at: number;
  ended_at: number;
}

export class SqliteHistoryRepository implements HistoryRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getDetail(recordId: string) {
    const row = await this.database.getFirstAsync<DetailRow>(
      `
        SELECT
          time_records.id AS record_id,
          timer_sessions.id AS session_id,
          timer_sessions.mode,
          time_records.event_id,
          time_records.event_name_snapshot,
          time_records.event_color_snapshot,
          time_records.todo_title_snapshot,
          time_records.started_at,
          time_records.ended_at,
          timer_sessions.reflection,
          COALESCE(SUM(
            CASE WHEN time_slices.kind = 'effective'
              THEN time_slices.ended_at - time_slices.started_at ELSE 0 END
          ), 0) AS effective_ms,
          COALESCE(SUM(
            CASE WHEN time_slices.kind != 'effective'
              THEN time_slices.ended_at - time_slices.started_at ELSE 0 END
          ), 0) AS paused_ms
        FROM time_records
        JOIN timer_sessions ON timer_sessions.id = time_records.session_id
        LEFT JOIN time_slices ON time_slices.record_id = time_records.id
        WHERE time_records.id = ?
          AND time_records.deleted_at IS NULL
          AND time_records.ended_at IS NOT NULL
        GROUP BY time_records.id
      `,
      recordId,
    );
    return row ? mapDetail(row) : null;
  }

  async updateRecord(input: UpdateHistoryRecordInput) {
    if (input.endsAt <= input.startsAt || input.endsAt > Date.now()) {
      throw new Error('INVALID_TIME_RANGE');
    }

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const record = await transaction.getFirstAsync<{ session_id: string }>(
        `
          SELECT session_id
          FROM time_records
          WHERE id = ? AND deleted_at IS NULL AND ended_at IS NOT NULL
        `,
        input.recordId,
      );
      if (!record) throw new Error('RECORD_NOT_FOUND');

      const overlap = await findOverlap(
        transaction,
        input.startsAt,
        input.endsAt,
        input.recordId,
      );
      if (overlap) throw new Error('TIME_RECORD_OVERLAP');

      const event = await transaction.getFirstAsync<EventRow>(
        'SELECT id, name, color_argb FROM events WHERE id = ? AND deleted_at IS NULL',
        input.eventId,
      );
      if (!event) throw new Error('EVENT_NOT_FOUND');

      const sliceRows = await transaction.getAllAsync<EditableSliceRow>(
        `
          SELECT id, kind, started_at, ended_at
          FROM time_slices
          WHERE record_id = ? AND ended_at IS NOT NULL
          ORDER BY started_at ASC
        `,
        input.recordId,
      );
      const slices = cropSlicesToRange(
        sliceRows.map((slice) => ({
          id: slice.id,
          kind: slice.kind,
          startsAt: slice.started_at,
          endsAt: slice.ended_at,
        })),
        input.startsAt,
        input.endsAt,
      );
      const now = Date.now();
      await transaction.runAsync('DELETE FROM time_slices WHERE record_id = ?', input.recordId);
      for (const slice of slices) {
        await transaction.runAsync(
          `
            INSERT INTO time_slices (id, record_id, kind, started_at, ended_at)
            VALUES (?, ?, ?, ?, ?)
          `,
          slice.id,
          input.recordId,
          slice.kind,
          slice.startsAt,
          slice.endsAt,
        );
      }
      await transaction.runAsync(
        `
          UPDATE time_records SET
            event_id = ?,
            event_name_snapshot = ?,
            event_color_snapshot = ?,
            started_at = ?,
            ended_at = ?,
            updated_at = ?
          WHERE id = ?
        `,
        event.id,
        event.name,
        event.color_argb,
        input.startsAt,
        input.endsAt,
        now,
        input.recordId,
      );
      await transaction.runAsync(
        `
          UPDATE timer_sessions SET
            reflection = ?,
            started_at = (
              SELECT MIN(started_at) FROM time_records
              WHERE session_id = ? AND deleted_at IS NULL
            ),
            ended_at = (
              SELECT MAX(ended_at) FROM time_records
              WHERE session_id = ? AND deleted_at IS NULL
            ),
            updated_at = ?
          WHERE id = ?
        `,
        input.reflection.trim() || null,
        record.session_id,
        record.session_id,
        now,
        record.session_id,
      );
    });
  }

  async updateRange(
    recordId: string,
    startsAt: number,
    endsAt: number,
    target: TimelineDragTarget,
  ) {
    if (endsAt <= startsAt || endsAt > Date.now()) throw new Error('INVALID_TIME_RANGE');
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const record = await transaction.getFirstAsync<{
        session_id: string;
        started_at: number;
      }>(
        `SELECT session_id, started_at FROM time_records
         WHERE id = ? AND deleted_at IS NULL AND ended_at IS NOT NULL`,
        recordId,
      );
      if (!record) throw new Error('RECORD_NOT_FOUND');
      if (await findOverlap(transaction, startsAt, endsAt, recordId)) {
        throw new Error('TIME_RECORD_OVERLAP');
      }
      if (target === 'body') {
        await shiftRecordSlices(transaction, recordId, startsAt - record.started_at);
      } else {
        await replaceRecordSlices(transaction, recordId, startsAt, endsAt);
      }
      const now = Date.now();
      await transaction.runAsync(
        `UPDATE time_records SET started_at = ?, ended_at = ?, updated_at = ? WHERE id = ?`,
        startsAt,
        endsAt,
        now,
        recordId,
      );
      await updateSessionBounds(transaction, record.session_id, now);
    });
  }

  async deleteRecord(recordId: string) {
    const result = await this.database.runAsync(
      `
        UPDATE time_records
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `,
      Date.now(),
      Date.now(),
      recordId,
    );
    if (result.changes !== 1) throw new Error('RECORD_NOT_FOUND');
  }

  async listTrash(now = Date.now()) {
    await purgeExpiredRecords(this.database, now);
    const rows = await this.database.getAllAsync<TrashRow>(
      `
        SELECT
          id AS record_id,
          event_name_snapshot,
          event_color_snapshot,
          started_at,
          ended_at,
          deleted_at
        FROM time_records
        WHERE deleted_at IS NOT NULL
          AND deleted_at > ?
          AND ended_at IS NOT NULL
        ORDER BY deleted_at DESC
      `,
      now - TRASH_RETENTION_MS,
    );
    return rows.map(mapTrash);
  }

  async restoreRecord(recordId: string) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const record = await transaction.getFirstAsync<{
        session_id: string;
        started_at: number;
        ended_at: number;
        deleted_at: number;
      }>(
        `
          SELECT session_id, started_at, ended_at, deleted_at
          FROM time_records
          WHERE id = ? AND deleted_at IS NOT NULL AND ended_at IS NOT NULL
        `,
        recordId,
      );
      if (!record) throw new Error('TRASH_RECORD_NOT_FOUND');
      if (record.deleted_at <= Date.now() - TRASH_RETENTION_MS) {
        throw new Error('TRASH_RECORD_EXPIRED');
      }

      const overlap = await findOverlap(
        transaction,
        record.started_at,
        record.ended_at,
        recordId,
      );
      if (overlap) throw new Error('TIME_RECORD_OVERLAP');

      await transaction.runAsync(
        'UPDATE time_records SET deleted_at = NULL, updated_at = ? WHERE id = ?',
        Date.now(),
        recordId,
      );
      await transaction.runAsync(
        `UPDATE timer_sessions SET status = 'saved', updated_at = ? WHERE id = ?`,
        Date.now(),
        record.session_id,
      );
    });
  }

  async prepareBackfill(requestedAt: number, now = Date.now()) {
    const provisionalStartsAt = buildBackfillRange(requestedAt, null, now).startsAt;

    const occupied = await findOverlap(
      this.database,
      provisionalStartsAt,
      provisionalStartsAt + 1,
    );
    if (occupied) throw new Error('TIME_RECORD_OVERLAP');

    const next = await this.database.getFirstAsync<{ starts_at: number | null }>(
      `
        SELECT MIN(started_at) AS starts_at
        FROM time_records
        WHERE deleted_at IS NULL AND started_at > ?
      `,
      provisionalStartsAt,
    );
    const { startsAt, endsAt } = buildBackfillRange(
      requestedAt,
      next?.starts_at ?? null,
      now,
    );

    const event = await this.findRecentActiveEvent();
    if (!event) throw new Error('EVENT_NOT_FOUND');
    return {
      startsAt,
      endsAt,
      eventId: event.id,
      eventName: event.name,
      eventColorArgb: event.color_argb,
    };
  }

  async createBackfill(input: CreateBackfillInput) {
    if (input.endsAt <= input.startsAt || input.endsAt > Date.now()) {
      throw new Error('INVALID_TIME_RANGE');
    }

    const sessionId = Crypto.randomUUID();
    const recordId = Crypto.randomUUID();
    const sliceId = Crypto.randomUUID();
    const createdAt = Date.now();

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const overlap = await findOverlap(transaction, input.startsAt, input.endsAt);
      if (overlap) throw new Error('TIME_RECORD_OVERLAP');

      const event = await transaction.getFirstAsync<EventRow>(
        `
          SELECT id, name, color_argb
          FROM events
          WHERE id = ? AND deleted_at IS NULL
        `,
        input.eventId,
      );
      if (!event) throw new Error('EVENT_NOT_FOUND');

      await transaction.runAsync(
        `
          INSERT INTO timer_sessions (
            id, mode, started_at, ended_at, status, reflection, created_at, updated_at
          ) VALUES (?, 'normal', ?, ?, 'saved', ?, ?, ?)
        `,
        sessionId,
        input.startsAt,
        input.endsAt,
        input.reflection?.trim() || null,
        createdAt,
        createdAt,
      );
      await transaction.runAsync(
        `
          INSERT INTO time_records (
            id, session_id, event_id, event_name_snapshot, event_color_snapshot,
            started_at, ended_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        recordId,
        sessionId,
        event.id,
        event.name,
        event.color_argb,
        input.startsAt,
        input.endsAt,
        createdAt,
        createdAt,
      );
      await transaction.runAsync(
        `
          INSERT INTO time_slices (id, record_id, kind, started_at, ended_at)
          VALUES (?, ?, 'effective', ?, ?)
        `,
        sliceId,
        recordId,
        input.startsAt,
        input.endsAt,
      );
    });
    return recordId;
  }

  private async findRecentActiveEvent() {
    const recent = await this.database.getFirstAsync<EventRow>(
      `
        SELECT events.id, events.name, events.color_argb
        FROM time_records
        JOIN events ON events.id = time_records.event_id
        WHERE time_records.deleted_at IS NULL
          AND events.deleted_at IS NULL
        ORDER BY time_records.started_at DESC
        LIMIT 1
      `,
    );
    if (recent) return recent;
    return this.database.getFirstAsync<EventRow>(
      `
        SELECT id, name, color_argb
        FROM events
        WHERE deleted_at IS NULL
        ORDER BY sort_order, created_at
        LIMIT 1
      `,
    );
  }
}

async function findOverlap(
  database: SQLiteDatabase,
  startsAt: number,
  endsAt: number,
  excludingRecordId = '',
) {
  return database.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM time_records
      WHERE deleted_at IS NULL
        AND id != ?
        AND started_at < ?
        AND COALESCE(ended_at, ?) > ?
      LIMIT 1
    `,
    excludingRecordId,
    endsAt,
    endsAt,
    startsAt,
  );
}

async function replaceRecordSlices(
  database: SQLiteDatabase,
  recordId: string,
  startsAt: number,
  endsAt: number,
) {
  const rows = await database.getAllAsync<EditableSliceRow>(
    `SELECT id, kind, started_at, ended_at FROM time_slices
     WHERE record_id = ? AND ended_at IS NOT NULL ORDER BY started_at ASC`,
    recordId,
  );
  const slices = cropSlicesToRange(
    rows.map((slice) => ({
      id: slice.id,
      kind: slice.kind,
      startsAt: slice.started_at,
      endsAt: slice.ended_at,
    })),
    startsAt,
    endsAt,
  );
  await database.runAsync('DELETE FROM time_slices WHERE record_id = ?', recordId);
  for (const slice of slices) {
    await database.runAsync(
      `INSERT INTO time_slices (id, record_id, kind, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?)`,
      slice.id,
      recordId,
      slice.kind,
      slice.startsAt,
      slice.endsAt,
    );
  }
}

async function shiftRecordSlices(database: SQLiteDatabase, recordId: string, deltaMs: number) {
  await database.runAsync(
    `UPDATE time_slices SET
       started_at = started_at + ?,
       ended_at = ended_at + ?
     WHERE record_id = ? AND ended_at IS NOT NULL`,
    deltaMs,
    deltaMs,
    recordId,
  );
}

async function updateSessionBounds(database: SQLiteDatabase, sessionId: string, now: number) {
  await database.runAsync(
    `UPDATE timer_sessions SET
       started_at = (SELECT MIN(started_at) FROM time_records
         WHERE session_id = ? AND deleted_at IS NULL),
       ended_at = (SELECT MAX(ended_at) FROM time_records
         WHERE session_id = ? AND deleted_at IS NULL),
       updated_at = ?
     WHERE id = ?`,
    sessionId,
    sessionId,
    now,
    sessionId,
  );
}

function mapDetail(row: DetailRow): HistoryRecordDetail {
  return {
    recordId: row.record_id,
    sessionId: row.session_id,
    mode: row.mode,
    eventId: row.event_id,
    eventName: row.event_name_snapshot,
    eventColorArgb: row.event_color_snapshot,
    todoTitle: row.todo_title_snapshot,
    startsAt: row.started_at,
    endsAt: row.ended_at,
    totalMs: row.ended_at - row.started_at,
    effectiveMs: row.effective_ms,
    pausedMs: row.paused_ms,
    reflection: row.reflection,
  };
}

function mapTrash(row: TrashRow): TrashedRecord {
  return {
    recordId: row.record_id,
    eventName: row.event_name_snapshot,
    eventColorArgb: row.event_color_snapshot,
    startsAt: row.started_at,
    endsAt: row.ended_at,
    deletedAt: row.deleted_at,
    expiresAt: trashExpiresAt(row.deleted_at),
  };
}
