import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TrackingEvent } from '@/domain/events/event';
import type { TodoItem } from '@/domain/todos/todo';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

type Selection = {
  event: TrackingEvent;
  todo: TodoItem | null;
};

export function EventArcSelector({
  events,
  initialEventId,
  isLocked,
  onAdd,
  onSelect,
  todos,
}: {
  events: TrackingEvent[];
  initialEventId?: string;
  isLocked: boolean;
  onAdd: () => void;
  onSelect: (selection: Selection) => void;
  todos: TodoItem[];
}) {
  const categories = useMemo(
    () => Array.from(new Map(events.map((event) => [event.categoryId, event.categoryName]))),
    [events],
  );
  const initialEvent = events.find((event) => event.id === initialEventId) ?? events[0] ?? null;
  const [categoryId, setCategoryId] = useState(initialEvent?.categoryId ?? categories[0]?.[0] ?? '');
  const [eventId, setEventId] = useState(initialEvent?.id ?? '');
  const [showTodos, setShowTodos] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const lastTapRef = useRef(0);
  const linkedTodos = todos.filter((todo) => todo.eventId);
  const visibleEvents = events.filter((event) => event.categoryId === categoryId);
  const locked = isLocked && !unlocked;

  const handleArcTap = () => {
    if (!isLocked) return;
    const now = Date.now();
    if (now - lastTapRef.current <= 360) setUnlocked(true);
    lastTapRef.current = now;
  };

  return (
    <Pressable accessibilityLabel="双层事件选择圆弧" onPress={handleArcTap} style={styles.arcShell}>
      <ScrollView
        contentContainerStyle={styles.outerContent}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {categories.map(([id, name]) => (
          <ArcOption
            key={id}
            label={name}
            selected={!showTodos && id === categoryId}
            onPress={() => {
              if (locked) return;
              const next = events.find((event) => event.categoryId === id);
              setShowTodos(false);
              setCategoryId(id);
              if (next) {
                setEventId(next.id);
                onSelect({ event: next, todo: null });
              }
            }}
          />
        ))}
        <ArcOption
          label="待办事项"
          selected={showTodos}
          onPress={() => {
            if (!locked) setShowTodos(true);
          }}
        />
        <ArcOption label="＋" selected={false} onPress={() => !locked && onAdd()} />
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.innerContent}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {showTodos
          ? linkedTodos.map((todo) => {
              const event = events.find((item) => item.id === todo.eventId);
              return event ? (
                <ArcOption
                  key={todo.id}
                  color={event.colorArgb}
                  label={todo.title}
                  selected={eventId === event.id}
                  onPress={() => {
                    if (locked) return;
                    setEventId(event.id);
                    onSelect({ event, todo });
                  }}
                />
              ) : null;
            })
          : visibleEvents.map((event) => (
              <ArcOption
                key={event.id}
                color={event.colorArgb}
                label={event.name}
                selected={event.id === eventId}
                onPress={() => {
                  if (locked) return;
                  setEventId(event.id);
                  onSelect({ event, todo: null });
                }}
              />
            ))}
        {!showTodos ? <ArcOption label="＋" selected={false} onPress={() => !locked && onAdd()} /> : null}
      </ScrollView>
      {locked ? <Text style={styles.lockHint}>已锁定 · 连续点击圆弧两次解锁</Text> : null}
      {isLocked && unlocked ? <Text style={styles.unlockHint}>已临时解锁，可切换事件</Text> : null}
    </Pressable>
  );
}

function ArcOption({ color, label, onPress, selected }: { color?: string; label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text numberOfLines={1} style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arcShell: { gap: spacing.sm, paddingTop: spacing.md, borderTopLeftRadius: 180, borderTopRightRadius: 180, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
  outerContent: { minWidth: '100%', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  innerContent: { minWidth: '100%', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  option: { minHeight: 36, maxWidth: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  optionText: { flexShrink: 1, color: colors.textMuted, fontSize: typography.small },
  optionTextSelected: { color: colors.text, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: radii.full },
  lockHint: { color: colors.textMuted, fontSize: typography.small, textAlign: 'center' },
  unlockHint: { color: colors.accent, fontSize: typography.small, textAlign: 'center' },
});
