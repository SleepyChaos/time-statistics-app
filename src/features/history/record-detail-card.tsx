import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TrackingEvent } from '@/domain/events/event';
import type { HistoryRecordDetail } from '@/domain/history/history-record';
import { stepByFiveMinutes } from '@/domain/time/snap';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function RecordDetailCard({
  detail,
  events,
  isMutating,
  onClose,
  onDelete,
  onUpdate,
}: {
  detail: HistoryRecordDetail;
  events: readonly TrackingEvent[];
  isMutating: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (
    input: {
      recordId: string;
      eventId: string;
      startsAt: number;
      endsAt: number;
      reflection: string;
    },
    onSuccess: () => void,
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const utilization = detail.totalMs > 0 ? detail.effectiveMs / detail.totalMs : 0;
  if (editing) {
    return (
      <RecordEditForm
        detail={detail}
        events={events}
        isMutating={isMutating}
        onCancel={() => setEditing(false)}
        onSave={(input) => onUpdate(input, () => setEditing(false))}
      />
    );
  }
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
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isMutating}
          onPress={() => setEditing(true)}
          style={styles.editButton}>
          <Text style={styles.editText}>编辑记录</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isMutating}
          onPress={onDelete}
          style={styles.deleteButton}>
          <Text style={styles.deleteText}>移入回收区</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RecordEditForm({
  detail,
  events,
  isMutating,
  onCancel,
  onSave,
}: {
  detail: HistoryRecordDetail;
  events: readonly TrackingEvent[];
  isMutating: boolean;
  onCancel: () => void;
  onSave: (
    input: {
      recordId: string;
      eventId: string;
      startsAt: number;
      endsAt: number;
      reflection: string;
    },
  ) => void;
}) {
  const [eventId, setEventId] = useState(detail.eventId);
  const [startsAt, setStartsAt] = useState(detail.startsAt);
  const [endsAt, setEndsAt] = useState(detail.endsAt);
  const [reflection, setReflection] = useState(detail.reflection ?? '');
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>编辑历史记录</Text>
        <Pressable accessibilityLabel="取消编辑" onPress={onCancel} hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.noteLabel}>所属事件</Text>
      <View style={styles.eventList}>
        {events.slice(0, 5).map((event) => (
          <Pressable
            key={event.id}
            onPress={() => setEventId(event.id)}
            style={[styles.eventChip, eventId === event.id && styles.eventChipSelected]}>
            <View style={[styles.smallDot, { backgroundColor: event.colorArgb }]} />
            <Text style={styles.eventChipText}>{event.name}</Text>
          </Pressable>
        ))}
      </View>
      <BoundaryEditor
        label="开始"
        onEarlier={() => setStartsAt((value) => stepByFiveMinutes(value, 'earlier'))}
        onLater={() => setStartsAt((value) => stepByFiveMinutes(value, 'later'))}
        value={startsAt}
      />
      <BoundaryEditor
        label="结束"
        onEarlier={() => setEndsAt((value) => stepByFiveMinutes(value, 'earlier'))}
        onLater={() => setEndsAt((value) => stepByFiveMinutes(value, 'later'))}
        value={endsAt}
      />
      {endsAt <= startsAt ? <Text style={styles.validation}>结束时间必须晚于开始时间。</Text> : null}
      <TextInput
        accessibilityLabel="编辑心得"
        multiline
        onChangeText={setReflection}
        placeholder="心得"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={reflection}
      />
      <Pressable
        accessibilityRole="button"
        disabled={isMutating || endsAt <= startsAt}
        onPress={() =>
          onSave({ recordId: detail.recordId, eventId, startsAt, endsAt, reflection })
        }
        style={styles.saveButton}>
        <Text style={styles.saveText}>保存修改</Text>
      </Pressable>
    </View>
  );
}

function BoundaryEditor({
  label,
  onEarlier,
  onLater,
  value,
}: {
  label: string;
  onEarlier: () => void;
  onLater: () => void;
  value: number;
}) {
  return (
    <View style={styles.boundary}>
      <Text style={styles.boundaryLabel}>{label}</Text>
      <Pressable onPress={onEarlier} style={styles.stepButton}>
        <Text style={styles.stepText}>−5</Text>
      </Pressable>
      <Text style={styles.boundaryValue}>{dateTimeFormatter.format(value)}</Text>
      <Pressable onPress={onLater} style={styles.stepButton}>
        <Text style={styles.stepText}>+5</Text>
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
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.tomato,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  editText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: '700',
  },
  deleteText: {
    color: colors.tomato,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  eventList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  eventChip: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  smallDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
  },
  eventChipText: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  boundary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boundaryLabel: {
    width: 32,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  boundaryValue: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepButton: {
    minWidth: 38,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  stepText: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: '700',
  },
  validation: {
    color: colors.tomato,
    fontSize: typography.small,
  },
  input: {
    minHeight: 64,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.caption,
    textAlignVertical: 'top',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
  },
});
