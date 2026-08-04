import type { SQLiteDatabase } from 'expo-sqlite';

import {
  defaultAppPreferences,
  pomodoroConfigSchema,
  type AppPreferenceKey,
  type AppPreferences,
} from '@/domain/settings/app-settings';

interface SettingRow {
  key: AppPreferenceKey;
  value_json: string;
}

export class SqliteSettingsRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getPreferences(): Promise<AppPreferences> {
    const rows = await this.database.getAllAsync<SettingRow>(
      `SELECT key, value_json FROM app_settings WHERE key IN (
        'pomodoroConfig', 'pomodoroSound', 'pomodoroHaptics', 'keepAwake',
        'scheduleNotifications', 'todoNotifications', 'reduceMotion', 'onboardingCompleted'
      )`,
    );
    const values: Partial<AppPreferences> = {};
    for (const row of rows) {
      try {
        const parsed: unknown = JSON.parse(row.value_json);
        if (row.key === 'pomodoroConfig') {
          values.pomodoroConfig = pomodoroConfigSchema.parse(parsed);
        } else if (typeof parsed === 'boolean') {
          (values as Record<string, unknown>)[row.key] = parsed;
        }
      } catch {
        // Invalid legacy values fall back to safe defaults.
      }
    }
    return { ...defaultAppPreferences, ...values };
  }

  async setPreference<K extends AppPreferenceKey>(key: K, value: AppPreferences[K]) {
    if (key === 'pomodoroConfig') pomodoroConfigSchema.parse(value);
    await this.database.runAsync(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      key,
      JSON.stringify(value),
      Date.now(),
    );
  }

  async getDataSummary() {
    const [records, schedules, todos, lastSaved] = await Promise.all([
      this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM time_records'),
      this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM schedule_items WHERE deleted_at IS NULL'),
      this.database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM todo_items WHERE deleted_at IS NULL'),
      this.database.getFirstAsync<{ saved_at: number | null }>('SELECT MAX(updated_at) AS saved_at FROM timer_sessions'),
    ]);
    return {
      recordCount: records?.count ?? 0,
      scheduleCount: schedules?.count ?? 0,
      todoCount: todos?.count ?? 0,
      lastSavedAt: lastSaved?.saved_at ?? null,
    };
  }
}
