import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 1;

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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
  `);

  await database.runAsync(
    `INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
    SCHEMA_VERSION,
    Date.now(),
  );
}
