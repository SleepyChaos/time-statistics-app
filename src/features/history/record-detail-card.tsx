import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HistoryRecordDetail } from '@/domain/history/history-record';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function RecordDetailCard({
  detail,
  isMutating,
  onClose,
  onDelete,
}: {
  detail: HistoryRecordDetail;
  isMutating: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const utilization = detail.totalMs > 0 ? detail.effectiveMs / detail.totalMs : 0;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: detail.eventColorArgb }]} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{detail.eventName}</Text>
          {detail.todoTitle ? <Text style={styles.todo}>待办 · {detail.todoTitle}</Text> : null}
        </View>
        <Pressable accessibilityLabel="关闭详情" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.time}>
        {dateTimeFormatter.format(detail.startsAt)} — {dateTimeFormatter.format(detail.endsAt)}
      </Text>
      <View style={styles.metrics}>
        <Metric label="总时长" value={formatDuration(detail.totalMs)} />
        <Metric label="有效" value={formatDuration(detail.effectiveMs)} />
        <Metric label="暂停" value={formatDuration(detail.pausedMs)} />
        <Metric label="利用率" value={`${Math.round(utilization * 100)}%`} />
      </View>
      <View style={styles.note}>
        <Text style={styles.noteLabel}>
          {detail.mode === 'pomodoro' ? '番茄钟' : '常规计时'} · 心得
        </Text>
        <Text style={styles.noteText}>{detail.reflection || '没有填写心得'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onDelete}
        style={styles.deleteButton}>
        <Text style={styles.deleteText}>移入 7 天回收区</Text>
      </Pressable>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}时${minutes}分` : `${minutes}分`;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  todo: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  close: {
    color: colors.textMuted,
    fontSize: 26,
  },
  time: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  note: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  noteLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  deleteButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.tomato,
  },
  deleteText: {
    color: colors.tomato,
    fontSize: typography.caption,
    fontWeight: '700',
  },
});

