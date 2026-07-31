import type { SQLiteDatabase } from 'expo-sqlite';

import { TRASH_RETENTION_MS } from '@/domain/history/history-record';

export async function purgeExpiredRecords(database: SQLiteDatabase, now = Date.now()) {
  const cutoff = now - TRASH_RETENTION_MS;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'DELETE FROM time_records WHERE deleted_at IS NOT NULL AND deleted_at <= ?',
      cutoff,
    );
    await transaction.runAsync(
      `
        DELETE FROM timer_sessions
        WHERE status != 'draft'
          AND NOT EXISTS (
            SELECT 1 FROM time_records WHERE time_records.session_id = timer_sessions.id
          )
      `,
    );
  });
}

