import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  ActiveTimer,
  PomodoroPhase,
  TimeSliceKind,
  TimerMode,
  TimerStatus,
} from '@/domain/timer/active-timer';

interface ActiveTimerRow {
  session_id: string;
  state: TimerStatus;
  mode: TimerMode;
  event_id: string;
  event_name_snapshot: string;
  event_color_snapshot: string;
  todo_link_id: string | null;
  todo_title_snapshot: string | null;
  phase_started_at: number;
  accumulated_effective_ms: number;
  accumulated_paused_ms: number;
  pomodoro_phase: PomodoroPhase | null;
  pomodoro_round: number;
  last_persisted_at: number;
  current_record_id: string;
  current_slice_id: string;
  pending_end_at: number | null;
}

interface EventSnapshotRow {
  id: string;
  name: string;
  color_argb: string;
}

interface SliceRow {
  kind: TimeSliceKind;
}

export interface StartTimerInput {
  mode: TimerMode;
  eventId: string;
  todoId?: string | null;
  todoTitle?: string | null;
  startsAt?: number;
}

export class SqliteTimerEngine {
  constructor(private readonly database: SQLiteDatabase) {}

  async getActive(): Promise<ActiveTimer | null> {
    const row = await this.database.getFirstAsync<ActiveTimerRow>(
      'SELECT * FROM active_timer WHERE singleton_id = 1',
    );
    return row ? mapActiveTimer(row) : null;
  }

  async start(input: StartTimerInput) {
    const now = input.startsAt ?? Date.now();
    const sessionId = Crypto.randomUUID();
    const recordId = Crypto.randomUUID();
    const sliceId = Crypto.randomUUID();

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = await loadActiveRow(transaction);
      if (active) {
        throw new Error('TIMER_ALREADY_ACTIVE');
      }

      const event = await loadEventSnapshot(transaction, input.eventId);
      const overlap = await transaction.getFirstAsync<{ id: string }>(
        `SELECT id FROM time_records
         WHERE deleted_at IS NULL
           AND started_at < ?
           AND COALESCE(ended_at, ?) > ?
         LIMIT 1`,
        now + 1,
        now + 1,
        now,
      );
      if (overlap) {
        throw new Error('TIME_RECORD_OVERLAP');
      }

      const phase: PomodoroPhase | null = input.mode === 'pomodoro' ? 'focus' : null;
      await transaction.runAsync(
        `INSERT INTO timer_sessions (
          id, mode, started_at, status, pomodoro_config_snapshot, created_at, updated_at
        ) VALUES (?, ?, ?, 'draft', ?, ?, ?)`,
        sessionId,
        input.mode,
        now,
        input.mode === 'pomodoro'
          ? JSON.stringify({
              focusMinutes: 25,
              shortBreakMinutes: 5,
              longBreakMinutes: 15,
              longBreakEvery: 4,
            })
          : null,
        now,
        now,
      );
      await insertRecord(transaction, {
        id: recordId,
        sessionId,
        event,
        todoId: input.todoId ?? null,
        todoTitle: input.todoTitle ?? null,
        startsAt: now,
      });
      await insertSlice(transaction, sliceId, recordId, 'effective', now);
      await transaction.runAsync(
        `INSERT INTO active_timer (
          singleton_id, session_id, state, mode, event_id,
          event_name_snapshot, event_color_snapshot, todo_link_id, todo_title_snapshot,
          phase_started_at, accumulated_effective_ms, accumulated_paused_ms,
          pomodoro_phase, pomodoro_round, last_persisted_at,
          current_record_id, current_slice_id
        ) VALUES (1, ?, 'running', ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?, ?)`,
        sessionId,
        input.mode,
        event.id,
        event.name,
        event.color_argb,
        input.todoId ?? null,
        input.todoTitle ?? null,
        now,
        phase,
        now,
        recordId,
        sliceId,
      );
    });

    return this.getActive();
  }

  async pause(at = Date.now()) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = requireActive(await loadActiveRow(transaction));
      requireNotFinishing(active);
      if (active.state !== 'running') {
        throw new Error('TIMER_NOT_RUNNING');
      }
      const slice = await loadSlice(transaction, active.current_slice_id);
      const delta = safeDelta(active.phase_started_at, at);
      const nextSliceId = Crypto.randomUUID();

      await closeSlice(transaction, active.current_slice_id, at);
      await insertSlice(transaction, nextSliceId, active.current_record_id, 'paused', at);
      await transaction.runAsync(
        `UPDATE active_timer SET
          state = 'paused',
          phase_started_at = ?,
          accumulated_effective_ms = accumulated_effective_ms + ?,
          accumulated_paused_ms = accumulated_paused_ms + ?,
          last_persisted_at = ?,
          current_slice_id = ?
         WHERE singleton_id = 1`,
        at,
        slice.kind === 'effective' ? delta : 0,
        slice.kind === 'effective' ? 0 : delta,
        at,
        nextSliceId,
      );
    });
    return this.getActive();
  }

  async resume(at = Date.now()) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = requireActive(await loadActiveRow(transaction));
      requireNotFinishing(active);
      if (active.state !== 'paused') {
        throw new Error('TIMER_NOT_PAUSED');
      }
      const delta = safeDelta(active.phase_started_at, at);
      const nextSliceId = Crypto.randomUUID();
      const kind = runningSliceKind(active.mode, active.pomodoro_phase);

      await closeSlice(transaction, active.current_slice_id, at);
      await insertSlice(transaction, nextSliceId, active.current_record_id, kind, at);
      await transaction.runAsync(
        `UPDATE active_timer SET
          state = 'running',
          phase_started_at = ?,
          accumulated_paused_ms = accumulated_paused_ms + ?,
          last_persisted_at = ?,
          current_slice_id = ?
         WHERE singleton_id = 1`,
        at,
        delta,
        at,
        nextSliceId,
      );
    });
    return this.getActive();
  }

  async switchEvent(eventId: string, at = Date.now()) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = requireActive(await loadActiveRow(transaction));
      requireNotFinishing(active);
      if (active.event_id === eventId) {
        return;
      }
      const event = await loadEventSnapshot(transaction, eventId);
      const currentSlice = await loadSlice(transaction, active.current_slice_id);
      const delta = safeDelta(active.phase_started_at, at);
      const nextRecordId = Crypto.randomUUID();
      const nextSliceId = Crypto.randomUUID();

      await closeSlice(transaction, active.current_slice_id, at);
      await transaction.runAsync(
        `UPDATE time_records SET ended_at = ?, updated_at = ? WHERE id = ?`,
        at,
        at,
        active.current_record_id,
      );
      await insertRecord(transaction, {
        id: nextRecordId,
        sessionId: active.session_id,
        event,
        todoId: active.todo_link_id,
        todoTitle: active.todo_title_snapshot,
        startsAt: at,
      });
      await insertSlice(transaction, nextSliceId, nextRecordId, currentSlice.kind, at);
      await transaction.runAsync(
        `UPDATE active_timer SET
          event_id = ?,
          event_name_snapshot = ?,
          event_color_snapshot = ?,
          phase_started_at = ?,
          accumulated_effective_ms = accumulated_effective_ms + ?,
          accumulated_paused_ms = accumulated_paused_ms + ?,
          last_persisted_at = ?,
          current_record_id = ?,
          current_slice_id = ?
         WHERE singleton_id = 1`,
        event.id,
        event.name,
        event.color_argb,
        at,
        currentSlice.kind === 'effective' ? delta : 0,
        currentSlice.kind === 'effective' ? 0 : delta,
        at,
        nextRecordId,
        nextSliceId,
      );
    });
    return this.getActive();
  }

  async requestEnd(at = Date.now()) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = requireActive(await loadActiveRow(transaction));
      if (active.pending_end_at !== null) {
        return;
      }
      const currentSlice = await loadSlice(transaction, active.current_slice_id);
      const delta = safeDelta(active.phase_started_at, at);
      await closeSlice(transaction, active.current_slice_id, at);
      await transaction.runAsync(
        `UPDATE time_records SET ended_at = ?, updated_at = ? WHERE id = ?`,
        at,
        at,
        active.current_record_id,
      );
      await transaction.runAsync(
        `UPDATE active_timer SET
          state = 'paused',
          pending_end_at = ?,
          accumulated_effective_ms = accumulated_effective_ms + ?,
          accumulated_paused_ms = accumulated_paused_ms + ?,
          last_persisted_at = ?
         WHERE singleton_id = 1`,
        at,
        currentSlice.kind === 'effective' ? delta : 0,
        currentSlice.kind === 'effective' ? 0 : delta,
        at,
      );
    });
    return this.getActive();
  }

  async endAndSave(reflection = '', completeTodo = false) {
    await this.finalize('saved', reflection, completeTodo);
  }

  async endAndDiscard() {
    await this.finalize('trashed', '', false);
  }

  private async finalize(
    status: 'saved' | 'trashed',
    reflection: string,
    completeTodo: boolean,
  ) {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = requireActive(await loadActiveRow(transaction));
      if (active.pending_end_at === null) {
        throw new Error('TIMER_END_NOT_REQUESTED');
      }
      const endedAt = active.pending_end_at;
      await transaction.runAsync(
        `UPDATE timer_sessions SET
          ended_at = ?, status = ?, reflection = ?, updated_at = ?
         WHERE id = ?`,
        endedAt,
        status,
        reflection.trim() || null,
        endedAt,
        active.session_id,
      );
      if (status === 'trashed') {
        await transaction.runAsync(
          'UPDATE time_records SET deleted_at = ?, updated_at = ? WHERE session_id = ?',
          endedAt,
          endedAt,
          active.session_id,
        );
      }
      if (completeTodo && active.todo_link_id) {
        await transaction.runAsync(
          `UPDATE todo_items
           SET is_completed = 1, updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
          endedAt,
          active.todo_link_id,
        );
      }
      await transaction.runAsync('DELETE FROM active_timer WHERE singleton_id = 1');
    });
  }
}

async function loadActiveRow(database: SQLiteDatabase) {
  return database.getFirstAsync<ActiveTimerRow>(
    'SELECT * FROM active_timer WHERE singleton_id = 1',
  );
}

function requireActive(row: ActiveTimerRow | null) {
  if (!row) {
    throw new Error('TIMER_NOT_ACTIVE');
  }
  return row;
}

function requireNotFinishing(row: ActiveTimerRow) {
  if (row.pending_end_at !== null) {
    throw new Error('TIMER_AWAITING_FINALIZATION');
  }
}

async function loadEventSnapshot(database: SQLiteDatabase, eventId: string) {
  const row = await database.getFirstAsync<EventSnapshotRow>(
    `SELECT id, name, color_argb FROM events
     WHERE id = ? AND deleted_at IS NULL`,
    eventId,
  );
  if (!row) {
    throw new Error('EVENT_NOT_FOUND');
  }
  return row;
}

async function loadSlice(database: SQLiteDatabase, sliceId: string) {
  const row = await database.getFirstAsync<SliceRow>(
    'SELECT kind FROM time_slices WHERE id = ? AND ended_at IS NULL',
    sliceId,
  );
  if (!row) {
    throw new Error('ACTIVE_SLICE_NOT_FOUND');
  }
  return row;
}

async function insertRecord(
  database: SQLiteDatabase,
  input: {
    id: string;
    sessionId: string;
    event: EventSnapshotRow;
    todoId: string | null;
    todoTitle: string | null;
    startsAt: number;
  },
) {
  await database.runAsync(
    `INSERT INTO time_records (
      id, session_id, event_id, event_name_snapshot, event_color_snapshot,
      todo_link_id, todo_title_snapshot, started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id,
    input.sessionId,
    input.event.id,
    input.event.name,
    input.event.color_argb,
    input.todoId,
    input.todoTitle,
    input.startsAt,
    input.startsAt,
    input.startsAt,
  );
}

async function insertSlice(
  database: SQLiteDatabase,
  id: string,
  recordId: string,
  kind: TimeSliceKind,
  startsAt: number,
) {
  await database.runAsync(
    `INSERT INTO time_slices (id, record_id, kind, started_at)
     VALUES (?, ?, ?, ?)`,
    id,
    recordId,
    kind,
    startsAt,
  );
}

async function closeSlice(database: SQLiteDatabase, id: string, endsAt: number) {
  const result = await database.runAsync(
    `UPDATE time_slices SET ended_at = ?
     WHERE id = ? AND ended_at IS NULL AND started_at <= ?`,
    endsAt,
    id,
    endsAt,
  );
  if (result.changes !== 1) {
    throw new Error('ACTIVE_SLICE_CLOSE_FAILED');
  }
}

function runningSliceKind(
  mode: TimerMode,
  phase: PomodoroPhase | null,
): TimeSliceKind {
  return mode === 'normal' || phase === 'focus' ? 'effective' : 'pomodoro-break';
}

function safeDelta(startsAt: number, endsAt: number) {
  if (endsAt < startsAt) {
    throw new Error('SYSTEM_CLOCK_MOVED_BACKWARD');
  }
  return endsAt - startsAt;
}

function mapActiveTimer(row: ActiveTimerRow): ActiveTimer {
  return {
    sessionId: row.session_id,
    recordId: row.current_record_id,
    sliceId: row.current_slice_id,
    status: row.state,
    mode: row.mode,
    eventId: row.event_id,
    eventName: row.event_name_snapshot,
    eventColorArgb: row.event_color_snapshot,
    todoId: row.todo_link_id,
    todoTitle: row.todo_title_snapshot,
    phase: row.pomodoro_phase,
    round: row.pomodoro_round,
    phaseStartedAt: row.phase_started_at,
    accumulatedEffectiveMs: row.accumulated_effective_ms,
    accumulatedPausedMs: row.accumulated_paused_ms,
    lastPersistedAt: row.last_persisted_at,
    pendingEndAt: row.pending_end_at,
  };
}
