import type { SQLiteDatabase } from 'expo-sqlite';

import type { TimeInterval } from '@/domain/time/interval';
import {
  calculateViewUtilization,
  type TimelineSchedule,
  type TimelineSlice,
} from '@/domain/timeline/timeline';
import type {
  TimelineRepository,
  TimelineSnapshot,
} from '@/domain/timeline/timeline-repository';
import type { TimeSliceKind } from '@/domain/timer/active-timer';

interface SliceRow {
  id: string;
  record_id: string;
  kind: TimeSliceKind;
  started_at: number;
  ended_at: number;
  event_name_snapshot: string;
  event_color_snapshot: string;
  todo_title_snapshot: string | null;
}

interface IntervalRow {
  starts_at: number;
  ends_at: number;
}

interface ScheduleRow {
  id: string;
  title: string;
  start_at: number;
  end_at: number;
  is_all_day: number;
  color_argb: string;
  occurrence_status: 'occurred' | 'not-occurred' | null;
}

export class SqliteTimelineRepository implements TimelineRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getSnapshot(input: {
    displayWindow: TimeInterval;
    utilizationWindow: TimeInterval;
    now: number;
  }): Promise<TimelineSnapshot> {
    const [slices, schedules, utilizationSlices, utilizationSchedules] = await Promise.all([
      this.listSlices(input.displayWindow),
      this.listSchedules(input.displayWindow),
      this.listEffectiveIntervals(input.utilizationWindow),
      this.listSchedules(input.utilizationWindow),
    ]);

    return {
      slices,
      schedules,
      utilization: calculateViewUtilization({
        effectiveSlices: utilizationSlices,
        schedules: utilizationSchedules,
        window: input.utilizationWindow,
        now: input.now,
      }),
    };
  }

  private async listSlices(window: TimeInterval) {
    const rows = await this.database.getAllAsync<SliceRow>(
      `
        SELECT
          time_slices.id,
          time_slices.record_id,
          time_slices.kind,
          time_slices.started_at,
          time_slices.ended_at,
          time_records.event_name_snapshot,
          time_records.event_color_snapshot,
          time_records.todo_title_snapshot
        FROM time_slices
        JOIN time_records ON time_records.id = time_slices.record_id
        JOIN timer_sessions ON timer_sessions.id = time_records.session_id
        WHERE timer_sessions.status = 'saved'
          AND time_records.deleted_at IS NULL
          AND time_slices.ended_at IS NOT NULL
          AND time_slices.started_at < ?
          AND time_slices.ended_at > ?
        ORDER BY time_slices.started_at ASC
      `,
      window.endsAt,
      window.startsAt,
    );
    return rows.map(mapSlice);
  }

  private async listEffectiveIntervals(window: TimeInterval) {
    const rows = await this.database.getAllAsync<IntervalRow>(
      `
        SELECT time_slices.started_at AS starts_at, time_slices.ended_at AS ends_at
        FROM time_slices
        JOIN time_records ON time_records.id = time_slices.record_id
        JOIN timer_sessions ON timer_sessions.id = time_records.session_id
        WHERE timer_sessions.status = 'saved'
          AND time_records.deleted_at IS NULL
          AND time_slices.kind = 'effective'
          AND time_slices.ended_at IS NOT NULL
          AND time_slices.started_at < ?
          AND time_slices.ended_at > ?
      `,
      window.endsAt,
      window.startsAt,
    );
    return rows.map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at }));
  }

  private async listSchedules(window: TimeInterval) {
    const rows = await this.database.getAllAsync<ScheduleRow>(
      `
        SELECT
          schedule_items.id,
          schedule_items.title,
          schedule_items.start_at,
          schedule_items.end_at,
          schedule_items.is_all_day,
          schedule_items.color_argb,
          schedule_occurrence_overrides.status AS occurrence_status
        FROM schedule_items
        LEFT JOIN schedule_occurrence_overrides
          ON schedule_occurrence_overrides.schedule_id = schedule_items.id
          AND schedule_occurrence_overrides.occurrence_start_at = schedule_items.start_at
        WHERE schedule_items.deleted_at IS NULL
          AND schedule_items.start_at < ?
          AND schedule_items.end_at > ?
        ORDER BY schedule_items.start_at ASC, schedule_items.end_at ASC
      `,
      window.endsAt,
      window.startsAt,
    );
    return rows.map(mapSchedule);
  }
}

function mapSlice(row: SliceRow): TimelineSlice {
  return {
    id: row.id,
    recordId: row.record_id,
    kind: row.kind,
    startsAt: row.started_at,
    endsAt: row.ended_at,
    eventName: row.event_name_snapshot,
    eventColorArgb: row.event_color_snapshot,
    todoTitle: row.todo_title_snapshot,
  };
}

function mapSchedule(row: ScheduleRow): TimelineSchedule {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.start_at,
    endsAt: row.end_at,
    isAllDay: row.is_all_day === 1,
    colorArgb: row.color_argb,
    isMarkedNotOccurred: row.occurrence_status === 'not-occurred',
  };
}

