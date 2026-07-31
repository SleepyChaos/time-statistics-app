import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BackfillDraft } from '@/domain/history/history-record';
import type { TrackingEvent } from '@/domain/events/event';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function BackfillCard({
  draft,
  events,
  isMutating,
  onClose,
  onSave,
}: {
  draft: BackfillDraft;
  events: readonly TrackingEvent[];
  isMutating: boolean;
  onClose: () => void;
  onSave: (input: {
    startsAt: number;
    endsAt: number;
    eventId: string;
    reflection: string;
  }) => void;
}) {
  const [eventId, setEventId] = useState(draft.eventId);
  const [reflection, setReflection] = useState('');
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>补记这段空白时间</Text>
        <Pressable accessibilityLabel="取消补记" onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Text style={styles.time}>
        {timeFormatter.format(draft.startsAt)} — {timeFormatter.format(draft.endsAt)}
      </Text>
      <Text style={styles.duration}>
        {Math.floor((draft.endsAt - draft.startsAt) / 60_000)} 分钟
      </Text>
      <Text style={styles.label}>所属事件</Text>
      <View style={styles.events}>
        {events.slice(0, 5).map((event) => (
          <Pressable
            key={event.id}
            accessibilityState={{ selected: eventId === event.id }}
            onPress={() => setEventId(event.id)}
            style={[styles.eventChip, eventId === event.id && styles.eventChipSelected]}>
            <View style={[styles.dot, { backgroundColor: event.colorArgb }]} />
            <Text style={styles.eventText}>{event.name}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="补记心得"
        multiline
        onChangeText={setReflection}
        placeholder="心得（可选）"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={reflection}
      />
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={() =>
          onSave({
            startsAt: draft.startsAt,
            endsAt: draft.endsAt,
            eventId,
            reflection,
          })
        }
        style={styles.saveButton}>
        <Text style={styles.saveText}>保存补记</Text>
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
    borderColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
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
  duration: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: '700',
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  events: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  eventChip: {
    minHeight: 36,
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  eventText: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  input: {
    minHeight: 72,
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
    minHeight: 46,
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
