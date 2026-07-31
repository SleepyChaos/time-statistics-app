import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { todoStageLabels, todoStages, type TodoStage } from '@/domain/todos/todo';
import { useActiveEvents } from '@/features/events/use-active-events';
import { useTodos } from '@/features/todos/use-todos';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

type StageFilter = TodoStage | 'all';

const FILTERS: readonly { key: StageFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'habit', label: '习惯' },
  { key: 'buffer', label: '缓冲' },
  { key: 'doing', label: 'DOing' },
  { key: 'future', label: '未来' },
];

export default function TodosScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<StageFilter>('all');
  const [draft, setDraft] = useState('');
  const [linkingTodoId, setLinkingTodoId] = useState<string | null>(null);
  const todos = useTodos(filter === 'all' ? undefined : filter);
  const events = useActiveEvents().data ?? [];
  const grouped = useMemo(
    () =>
      todoStages
        .map((stage) => ({
          stage,
          items: todos.todos.filter((todo) => todo.stage === stage),
        }))
        .filter((group) => group.items.length > 0),
    [todos.todos],
  );

  const create = () => {
    if (!draft.trim()) return;
    todos.create(
      {
        title: draft,
        stage: filter === 'all' ? 'buffer' : filter,
      },
      { onSuccess: () => setDraft('') },
    );
  };

  return (
    <Screen eyebrow="REMINDERS" title="待办事项" contentStyle={styles.content}>
      <View style={styles.categoryRail}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.key }}
            onPress={() => setFilter(item.key)}
            style={[styles.category, filter === item.key && styles.categoryActive]}>
            <Text
              style={[styles.categoryText, filter === item.key && styles.categoryTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {grouped.map((group) => (
          <View key={group.stage} style={styles.group}>
            <Text style={styles.groupTitle}>{todoStageLabels[group.stage]}</Text>
            {group.items.map((todo) => (
              <View key={todo.id}>
                <View style={styles.todo}>
                  <Pressable
                    accessibilityLabel={`完成${todo.title}`}
                    accessibilityRole="checkbox"
                    onPress={() => todos.complete(todo.id)}
                    style={styles.checkbox}
                  />
                  <Pressable
                    accessibilityHint={
                      todo.eventId ? '长按转到计时页' : '点击选择所属计时事件'
                    }
                    delayLongPress={350}
                    onLongPress={() => {
                      if (!todo.eventId) {
                        setLinkingTodoId(todo.id);
                        return;
                      }
                      router.navigate({
                        pathname: '/timer',
                        params: {
                          eventId: todo.eventId,
                          todoId: todo.id,
                          todoTitle: todo.title,
                        },
                      });
                    }}
                    onPress={() =>
                      setLinkingTodoId((current) => (current === todo.id ? null : todo.id))
                    }
                    style={styles.todoBody}>
                    <Text style={styles.todoTitle}>{todo.title}</Text>
                    <Text style={styles.todoMeta}>
                      {todo.eventName ? `关联 · ${todo.eventName}` : '未关联计时事件'}
                    </Text>
                  </Pressable>
                </View>
                {linkingTodoId === todo.id ? (
                  <View style={styles.eventPicker}>
                    {events.slice(0, 5).map((event) => (
                      <Pressable
                        key={event.id}
                        onPress={() => {
                          todos.linkEvent({ todoId: todo.id, eventId: event.id });
                          setLinkingTodoId(null);
                        }}
                        style={[
                          styles.eventChip,
                          todo.eventId === event.id && styles.eventChipSelected,
                        ]}>
                        <View style={[styles.eventDot, { backgroundColor: event.colorArgb }]} />
                        <Text style={styles.eventChipText}>
                          {event.categoryName} → {event.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
        {todos.isLoading ? <Text style={styles.empty}>正在读取本地待办…</Text> : null}
        {!todos.isLoading && grouped.length === 0 ? (
          <Text style={styles.empty}>这里还没有待办事项。</Text>
        ) : null}
        <View style={styles.addRow}>
          <TextInput
            accessibilityLabel="待办标题"
            onChangeText={setDraft}
            onSubmitEditing={create}
            placeholder={filter === 'all' ? '新增到待办缓冲区' : `新增到${filterLabel(filter)}`}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!draft.trim() || todos.isMutating}
            onPress={create}
            style={styles.addButton}>
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function filterLabel(filter: Exclude<StageFilter, 'all'>) {
  return todoStageLabels[filter];
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
  },
  categoryRail: {
    width: 66,
    gap: spacing.sm,
  },
  category: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  categoryActive: {
    backgroundColor: colors.accentMuted,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  categoryTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
  group: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  groupTitle: {
    color: colors.tomato,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  todoTitle: {
    color: colors.text,
    fontSize: typography.body,
  },
  todoBody: {
    flex: 1,
    gap: spacing.xs,
  },
  todoMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  eventPicker: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingLeft: 38,
  },
  eventChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  eventChipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
  },
  addText: {
    color: colors.accent,
    fontSize: typography.heading,
  },
});
