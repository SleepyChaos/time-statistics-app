import type { SQLiteDatabase } from 'expo-sqlite';

import {
  aggregateCategories,
  attachEventTrends,
  type EventTimeStatistic,
  type StatisticsSnapshot,
  type TodoTimeStatistic,
} from '@/domain/statistics/statistics';
import { SqliteTimelineRepository } from '@/infrastructure/repositories/sqlite-timeline-repository';

interface EventStatisticRow {
  event_id: string;
  event_name: string;
  event_color_argb: string;
  category_id: string;
  category_name: string;
  effective_ms: number;
}

interface TodoStatisticRow {
  todo_id: string;
  title: string;
  effective_ms: number;
  record_count: number;
  first_started_at: number;
  last_started_at: number;
}

interface EventSliceRow {
  event_id: string;
  starts_at: number;
  ends_at: number;
}

export class SqliteStatisticsRepository {
  private readonly timeline: SqliteTimelineRepository;

  constructor(private readonly database: SQLiteDatabase) {
    this.timeline = new SqliteTimelineRepository(database);
  }

  async getSnapshot(startsAt: number, endsAt: number, now = Date.now()): Promise<StatisticsSnapshot> {
    const duration = endsAt - startsAt;
    const previousStartsAt = startsAt - duration;
    const effectiveNow = Math.min(now, endsAt);
    const [timeline, previousTimeline, eventTotals, eventSlices, todos] = await Promise.all([
      this.timeline.getSnapshot({
        displayWindow: { startsAt, endsAt },
        utilizationWindow: { startsAt, endsAt },
        now: effectiveNow,
      }),
      this.timeline.getSnapshot({
        displayWindow: { startsAt: previousStartsAt, endsAt: startsAt },
        utilizationWindow: { startsAt: previousStartsAt, endsAt: startsAt },
        now: startsAt,
      }),
      this.listEventStatistics(startsAt, endsAt),
      this.listEffectiveEventSlices(startsAt, endsAt),
      this.listTodoStatistics(startsAt, endsAt),
    ]);
    const events = attachEventTrends(eventTotals, eventSlices, startsAt, endsAt);
    return {
      startsAt,
      endsAt,
      utilization: timeline.utilization,
      previousUtilizationRatio: previousTimeline.utilization.ratio,
      categories: aggregateCategories(events),
      events,
      todos,
    };
  }

  private async listEventStatistics(startsAt: number, endsAt: number) {
    const rows = await this.database.getAllAsync<EventStatisticRow>(
      `SELECT records.event_id,
              records.event_name_snapshot AS event_name,
              records.event_color_snapshot AS event_color_argb,
              events.category_id,
              categories.name AS category_name,
              SUM(MAX(0, MIN(COALESCE(slices.ended_at, ?), ?) - MAX(slices.started_at, ?))) AS effective_ms
       FROM time_slices slices
       JOIN time_records records ON records.id = slices.record_id
       JOIN events ON events.id = records.event_id
       JOIN event_categories categories ON categories.id = events.category_id
       WHERE slices.kind = 'effective' AND records.deleted_at IS NULL
         AND slices.started_at < ? AND COALESCE(slices.ended_at, ?) > ?
       GROUP BY records.event_id, records.event_name_snapshot, records.event_color_snapshot,
                events.category_id, categories.name
       ORDER BY effective_ms DESC`,
      endsAt,
      endsAt,
      startsAt,
      endsAt,
      endsAt,
      startsAt,
    );
    return rows.map((row) => ({
      eventId: row.event_id,
      eventName: row.event_name,
      eventColorArgb: row.event_color_argb,
      categoryId: row.category_id,
      categoryName: row.category_name,
      effectiveMs: row.effective_ms,
      trendMs: [],
    })) satisfies EventTimeStatistic[];
  }

  private async listEffectiveEventSlices(startsAt: number, endsAt: number) {
    const rows = await this.database.getAllAsync<EventSliceRow>(
      `SELECT records.event_id,
              MAX(slices.started_at, ?) AS starts_at,
              MIN(COALESCE(slices.ended_at, ?), ?) AS ends_at
       FROM time_slices slices
       JOIN time_records records ON records.id = slices.record_id
       WHERE slices.kind = 'effective' AND records.deleted_at IS NULL
         AND slices.started_at < ? AND COALESCE(slices.ended_at, ?) > ?`,
      startsAt,
      endsAt,
      endsAt,
      endsAt,
      endsAt,
      startsAt,
    );
    return rows.map((row) => ({
      eventId: row.event_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }));
  }

  private async listTodoStatistics(startsAt: number, endsAt: number) {
    const rows = await this.database.getAllAsync<TodoStatisticRow>(
      `SELECT records.todo_link_id AS todo_id,
              (SELECT recent.todo_title_snapshot FROM time_records recent
               WHERE recent.todo_link_id = records.todo_link_id
               ORDER BY recent.started_at DESC LIMIT 1) AS title,
              SUM(MAX(0, MIN(COALESCE(slices.ended_at, ?), ?) - MAX(slices.started_at, ?))) AS effective_ms,
              COUNT(DISTINCT records.id) AS record_count,
              MIN(records.started_at) AS first_started_at,
              MAX(records.started_at) AS last_started_at
       FROM time_slices slices
       JOIN time_records records ON records.id = slices.record_id
       WHERE slices.kind = 'effective' AND records.deleted_at IS NULL
         AND records.todo_link_id IS NOT NULL
         AND slices.started_at < ? AND COALESCE(slices.ended_at, ?) > ?
       GROUP BY records.todo_link_id
       ORDER BY effective_ms DESC`,
      endsAt,
      endsAt,
      startsAt,
      endsAt,
      endsAt,
      startsAt,
    );
    return rows.map((row) => ({
      todoId: row.todo_id,
      title: row.title,
      effectiveMs: row.effective_ms,
      recordCount: row.record_count,
      firstStartedAt: row.first_started_at,
      lastStartedAt: row.last_started_at,
      averageEffectiveMs: row.record_count > 0 ? row.effective_ms / row.record_count : 0,
    })) satisfies TodoTimeStatistic[];
  }
}
