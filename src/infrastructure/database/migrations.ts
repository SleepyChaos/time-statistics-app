export interface DatabaseMigration {
  version: number;
  sql: string;
}

export const databaseMigrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL REFERENCES event_categories(id),
        name TEXT NOT NULL,
        color_argb TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS active_timer (
        singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
        session_id TEXT NOT NULL,
        state TEXT NOT NULL,
        event_id TEXT NOT NULL,
        todo_link_id TEXT,
        phase_started_at INTEGER NOT NULL,
        accumulated_effective_ms INTEGER NOT NULL DEFAULT 0,
        accumulated_paused_ms INTEGER NOT NULL DEFAULT 0,
        pomodoro_phase TEXT,
        pomodoro_round INTEGER NOT NULL DEFAULT 0,
        last_persisted_at INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE active_timer ADD COLUMN mode TEXT NOT NULL DEFAULT 'normal';
      ALTER TABLE active_timer ADD COLUMN current_record_id TEXT;
      ALTER TABLE active_timer ADD COLUMN current_slice_id TEXT;
      ALTER TABLE active_timer ADD COLUMN event_name_snapshot TEXT NOT NULL DEFAULT '';
      ALTER TABLE active_timer ADD COLUMN event_color_snapshot TEXT NOT NULL DEFAULT '#777F90';
      ALTER TABLE active_timer ADD COLUMN todo_title_snapshot TEXT;

      CREATE TABLE IF NOT EXISTS timer_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('normal', 'pomodoro')),
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        status TEXT NOT NULL CHECK (status IN ('draft', 'saved', 'trashed')),
        reflection TEXT,
        pomodoro_config_snapshot TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS time_records (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES timer_sessions(id),
        event_id TEXT NOT NULL REFERENCES events(id),
        event_name_snapshot TEXT NOT NULL,
        event_color_snapshot TEXT NOT NULL,
        todo_link_id TEXT,
        todo_title_snapshot TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS time_slices (
        id TEXT PRIMARY KEY NOT NULL,
        record_id TEXT NOT NULL REFERENCES time_records(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('effective', 'paused', 'pomodoro-break')),
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS schedule_items (
        id TEXT PRIMARY KEY NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('local', 'eventkit')),
        external_id TEXT,
        external_calendar_id TEXT,
        title TEXT NOT NULL,
        start_at INTEGER NOT NULL,
        end_at INTEGER NOT NULL,
        is_all_day INTEGER NOT NULL DEFAULT 0,
        color_argb TEXT NOT NULL,
        occurrence_key TEXT,
        last_external_update_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS schedule_occurrence_overrides (
        schedule_id TEXT NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
        occurrence_start_at INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('occurred', 'not-occurred')),
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (schedule_id, occurrence_start_at)
      );

      CREATE TABLE IF NOT EXISTS todo_items (
        id TEXT PRIMARY KEY NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('local', 'eventkit')),
        external_id TEXT,
        external_list_id TEXT,
        stage TEXT NOT NULL CHECK (
          stage IN ('habit', 'buffer', 'doing', 'future', 'unclassified')
        ),
        title TEXT NOT NULL,
        due_at INTEGER,
        due_has_time INTEGER NOT NULL DEFAULT 0,
        is_completed INTEGER NOT NULL DEFAULT 0,
        recurrence_snapshot TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        last_external_update_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS todo_event_links (
        todo_id TEXT PRIMARY KEY NOT NULL REFERENCES todo_items(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminder_list_mappings (
        stage TEXT PRIMARY KEY NOT NULL,
        external_list_id TEXT NOT NULL,
        external_list_name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        source TEXT PRIMARY KEY NOT NULL,
        last_refreshed_at INTEGER NOT NULL,
        cursor TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS content_pool (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('quote', 'suggestion', 'word')),
        content TEXT NOT NULL,
        attribution TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_enabled INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_events_category_sort
        ON events(category_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_records_time
        ON time_records(started_at, ended_at);
      CREATE INDEX IF NOT EXISTS idx_records_event_time
        ON time_records(event_id, started_at);
      CREATE INDEX IF NOT EXISTS idx_records_todo_time
        ON time_records(todo_link_id, started_at);
      CREATE INDEX IF NOT EXISTS idx_slices_record_time
        ON time_slices(record_id, started_at);
      CREATE INDEX IF NOT EXISTS idx_schedules_time
        ON schedule_items(start_at, end_at);
      CREATE INDEX IF NOT EXISTS idx_todos_stage_due
        ON todo_items(stage, is_completed, due_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_external
        ON todo_items(external_id) WHERE external_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_outbox_retry
        ON sync_outbox(status, next_retry_at);
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE active_timer ADD COLUMN pending_end_at INTEGER;
    `,
  },
  {
    version: 4,
    sql: `
      CREATE INDEX IF NOT EXISTS idx_sessions_status
        ON timer_sessions(status, started_at, ended_at);
      CREATE INDEX IF NOT EXISTS idx_slices_kind_time
        ON time_slices(kind, started_at, ended_at);
      CREATE INDEX IF NOT EXISTS idx_schedule_overrides_status
        ON schedule_occurrence_overrides(status, occurrence_start_at);
    `,
  },
];
