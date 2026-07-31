import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TRASH_RETENTION_MS } from '@/domain/history/history-record';
import { useRecycleBin } from '@/features/history/use-history';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function RecycleBinScreen() {
  const router = useRouter();
  const recycleBin = useRecycleBin();
  const [now] = useState(() => Date.now());
  return (
    <Screen eyebrow="DATA" title="7 天回收区">
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ 返回设置</Text>
      </Pressable>
      <Text style={styles.explanation}>删除的时间记录保留 7 天，过期后自动永久清理。</Text>
      {recycleBin.records.map((record) => {
        const remainingMs = Math.max(0, record.expiresAt - now);
        const remainingDays = Math.max(1, Math.ceil(remainingMs / (TRASH_RETENTION_MS / 7)));
        return (
          <View key={record.recordId} style={styles.record}>
            <View style={[styles.dot, { backgroundColor: record.eventColorArgb }]} />
            <View style={styles.recordBody}>
              <Text style={styles.recordTitle}>{record.eventName}</Text>
              <Text style={styles.recordTime}>
                {dateFormatter.format(record.startsAt)} — {dateFormatter.format(record.endsAt)}
              </Text>
              <Text style={styles.expiry}>剩余约 {remainingDays} 天</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={recycleBin.isRestoring}
              onPress={() => recycleBin.restore(record.recordId)}
              style={styles.restoreButton}>
              <Text style={styles.restoreText}>恢复</Text>
            </Pressable>
          </View>
        );
      })}
      {recycleBin.isLoading ? <Text style={styles.empty}>正在读取回收记录…</Text> : null}
      {!recycleBin.isLoading && recycleBin.records.length === 0 ? (
        <Text style={styles.empty}>回收区是空的。</Text>
      ) : null}
      {recycleBin.error ? (
        <Text style={styles.error}>{readableRestoreError(recycleBin.error)}</Text>
      ) : null}
    </Screen>
  );
}

function readableRestoreError(error: Error) {
  const messages: Record<string, string> = {
    TIME_RECORD_OVERLAP: '原时间段已有其他记录，暂时无法恢复。',
    TRASH_RECORD_EXPIRED: '这条记录已经超过 7 天，无法恢复。',
  };
  return messages[error.message] ?? '恢复失败，请稍后重试。';
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: colors.accent,
    fontSize: typography.body,
  },
  explanation: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 21,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  recordBody: {
    flex: 1,
    gap: spacing.xs,
  },
  recordTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  recordTime: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontVariant: ['tabular-nums'],
  },
  expiry: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  restoreButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
  },
  restoreText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  error: {
    color: colors.tomato,
    fontSize: typography.caption,
    textAlign: 'center',
  },
});
