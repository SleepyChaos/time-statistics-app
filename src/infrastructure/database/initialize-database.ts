import type { SQLiteDatabase } from 'expo-sqlite';

import { purgeExpiredRecords } from './maintenance';
import { databaseMigrations } from './migrations';

const DEFAULT_CATEGORY_ID = 'system-category-default';
const DEFAULT_EVENT_ID = 'system-event-unclassified';

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const row = await database.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  const currentVersion = row?.version ?? 0;

  for (const migration of databaseMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migration.sql);
      await transaction.runAsync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        migration.version,
        Date.now(),
      );
    });
  }

  await seedRequiredData(database);
  await purgeExpiredRecords(database);
}

async function seedRequiredData(database: SQLiteDatabase) {
  const now = Date.now();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT OR IGNORE INTO event_categories (
        id, name, sort_order, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      DEFAULT_CATEGORY_ID,
      '默认',
      0,
      1,
      now,
      now,
    );
    await transaction.runAsync(
      `INSERT OR IGNORE INTO events (
        id, category_id, name, color_argb, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      DEFAULT_EVENT_ID,
      DEFAULT_CATEGORY_ID,
      '未分类时间',
      '#777F90',
      0,
      now,
      now,
    );
    await transaction.runAsync(
      `INSERT OR IGNORE INTO app_settings (key, value_json, updated_at)
       VALUES (?, ?, ?)`,
      'pomodoroConfig',
      JSON.stringify({
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4,
      }),
      now,
    );
    const contentItems = [
      ['content-quote-1', 'quote', '记录是为了看见，而不是为了控制。', null, 0],
      ['content-quote-2', 'quote', '稳定地留下证据，胜过模糊地依赖感觉。', null, 1],
      ['content-suggestion-1', 'suggestion', '先记录下一段真实投入，再决定是否调整计划。', null, 2],
      ['content-suggestion-2', 'suggestion', '如果开始很困难，就只承诺专注十五分钟。', null, 3],
      ['content-number-1', 'suggestion', '推荐数目：今天优先保留 3 件真正重要的事。', null, 4],
      ['content-number-2', 'suggestion', '推荐数目：每 90 分钟检查一次当前方向。', null, 5],
      ['content-word-1', 'word', 'Deliberate · 有意识的', null, 6],
      ['content-word-2', 'word', 'Momentum · 持续推进的势能', null, 7],
    ] as const;
    for (const item of contentItems) {
      await transaction.runAsync(
        `INSERT OR IGNORE INTO content_pool (
          id, kind, content, attribution, sort_order, is_enabled
        ) VALUES (?, ?, ?, ?, ?, 1)`,
        ...item,
      );
    }
  });
}
