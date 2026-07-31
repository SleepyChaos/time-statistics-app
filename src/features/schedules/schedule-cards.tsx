import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ScheduleDetail } from '@/domain/schedules/schedule';
import { stepByFiveMinutes } from '@/domain/time/snap';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const SCHEDULE_COLORS = ['#7C83FF', '#FF5A5F', '#4DB6AC', '#FFB74D'] as const;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function CreateScheduleCard({
  initialEndsAt,
  initialStartsAt,
  isMutating,
  onClose,
  onSave,
}: {
  initialEndsAt: number;
  initialStartsAt: number;
  isMutating: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    startsAt: number;
    endsAt: number;
    colorArgb: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(initialStartsAt);
  const [endsAt, setEndsAt] = useState(initialEndsAt);
  const [colorArgb, setColorArgb] = useState<string>(SCHEDULE_COLORS[0]);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>新增本地日程</Text>
        <Pressable accessibilityLabel="取消新增日程" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="日程标题"
        autoFocus
        onChangeText={setTitle}
        placeholder="日程标题"
        placeholderTextColor={colors.textMuted}
        style={styles.titleInput}
        value={title}
      />
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
      <View style={styles.colors}>
        {SCHEDULE_COLORS.map((color) => (
          <Pressable
            key={color}
            accessibilityLabel={`选择颜色${color}`}
            accessibilityState={{ selected: colorArgb === color }}
            onPress={() => setColorArgb(color)}
            style={[
              styles.color,
              { backgroundColor: color },
              colorArgb === color && styles.colorSelected,
            ]}
          />
        ))}
      </View>
      {endsAt <= startsAt ? <Text style={styles.error}>结束时间必须晚于开始时间。</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={!title.trim() || endsAt <= startsAt || isMutating}
        onPress={() => onSave({ title, startsAt, endsAt, colorArgb })}
        style={styles.primaryButton}>
        <Text style={styles.primaryText}>保存日程</Text>
      </Pressable>
    </View>
  );
}

export function ScheduleDetailCard({
  detail,
  isMutating,
  now,
  onClose,
  onToggleOccurred,
}: {
  detail: ScheduleDetail;
  isMutating: boolean;
  now: number;
  onClose: () => void;
  onToggleOccurred: () => void;
}) {
  const canMark = detail.startsAt < now;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: detail.colorArgb }]} />
        <View style={styles.heading}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.source}>
            {detail.source === 'local' ? '本地日程' : 'Apple 日历'}
          </Text>
        </View>
        <Pressable accessibilityLabel="关闭日程详情" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.time}>
        {dateFormatter.format(detail.startsAt)} — {dateFormatter.format(detail.endsAt)}
      </Text>
      <Text style={styles.status}>
        {detail.isMarkedNotOccurred ? '标记为未发生，不计入有效时间' : '已发生后计入有效时间'}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!canMark || isMutating}
        onPress={onToggleOccurred}
        style={[styles.secondaryButton, !canMark && styles.disabledButton]}>
        <Text style={styles.secondaryText}>
          {detail.isMarkedNotOccurred ? '改为已发生' : '标记为未发生'}
        </Text>
      </Pressable>
      {!canMark ? <Text style={styles.hint}>日程开始后才可以修改发生状态。</Text> : null}
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
      <Text style={styles.timeValue}>{dateFormatter.format(value)}</Text>
      <Pressable onPress={onLater} style={styles.stepButton}>
        <Text style={styles.stepText}>+5</Text>
      </Pressable>
    </View>
  );
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
  heading: {
    flex: 1,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  source: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  close: {
    color: colors.textMuted,
    fontSize: 26,
  },
  titleInput: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.body,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  timeValue: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  colors: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  color: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  time: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
  status: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  error: {
    color: colors.tomato,
    fontSize: typography.small,
  },
});
