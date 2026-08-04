import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { pomodoroPhaseDurationMs, type ActiveTimer } from '@/domain/timer/active-timer';

const SETTING_KEY = 'active_pomodoro_notification_id';

export class PomodoroNotificationScheduler {
  constructor(private readonly database: SQLiteDatabase) {}

  async schedule(timer: ActiveTimer | null) {
    await this.cancel();
    if (!timer || timer.mode !== 'pomodoro' || timer.status !== 'running') return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const soundSetting = await this.database.getFirstAsync<{ value_json: string }>(
      `SELECT value_json FROM app_settings WHERE key = 'pomodoroSound'`,
    );
    const soundEnabled = soundSetting ? JSON.parse(soundSetting.value_json) !== false : true;
    const seconds = Math.max(
      1,
      Math.ceil((timer.phaseStartedAt + pomodoroPhaseDurationMs(timer) - Date.now()) / 1_000),
    );
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: timer.phase === 'focus' ? '本轮专注时间到了' : '休息时间到了',
        body: '打开应用确认后再切换到下一阶段。',
        data: { route: '/timer', sessionId: timer.sessionId },
        sound: soundEnabled ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    await this.database.runAsync(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      SETTING_KEY,
      JSON.stringify(identifier),
      Date.now(),
    );
  }

  async cancel() {
    const row = await this.database.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM app_settings WHERE key = ?',
      SETTING_KEY,
    );
    if (row) {
      try {
        await Notifications.cancelScheduledNotificationAsync(JSON.parse(row.value_json));
      } catch {
        // The system may already have delivered or removed the notification.
      }
      await this.database.runAsync('DELETE FROM app_settings WHERE key = ?', SETTING_KEY);
    }
  }
}
