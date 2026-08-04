import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { findTodoDropStage, type TodoDropTarget } from '@/domain/todos/drop-target';
import { todoStageLabels, todoStages, type TodoStage } from '@/domain/todos/todo';
import { useActiveEvents } from '@/features/events/use-active-events';
import { DraggableTodoSurface } from '@/features/todos/draggable-todo-surface';
import { useTodos } from '@/features/todos/use-todos';
import { useTodoViewState } from '@/features/todos/use-todo-view-state';
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
  const [selectedFilter, setSelectedFilter] = useState<StageFilter | null>(null);
  const [draft, setDraft] = useState('');
  const [dueChoice, setDueChoice] = useState<number | 'custom' | null>(null);
  const [customDueDate, setCustomDueDate] = useState('');
  const [customDueTime, setCustomDueTime] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [linkingTodoId, setLinkingTodoId] = useState<string | null>(null);
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const viewState = useTodoViewState();
  const saveViewState = viewState.save;
  const filter = selectedFilter ?? viewState.state?.filter ?? 'all';
  const screenScrollRef = useRef<ScrollView>(null);
  const filterRef = useRef<StageFilter>('all');
  const scrollYRef = useRef(0);
  const categoryRefs = useRef<Partial<Record<TodoStage, View | null>>>({});
  const dropTargets = useRef<TodoDropTarget[]>([]);
  const todos = useTodos(filter === 'all' ? undefined : filter);
  const moveTodo = todos.move;
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

  useEffect(() => {
    if (!viewState.state) return;
    filterRef.current = viewState.state.filter;
    scrollYRef.current = viewState.state.scrollY;
    requestAnimationFrame(() => screenScrollRef.current?.scrollTo({ y: viewState.state?.scrollY ?? 0, animated: false }));
  }, [viewState.state]);
  useFocusEffect(
    useCallback(
      () => () => saveViewState({ filter: filterRef.current, scrollY: scrollYRef.current }),
      [saveViewState],
    ),
  );

  const create = () => {
    if (!draft.trim()) return;
    const customDue = dueChoice === 'custom' ? parseCustomDue(customDueDate, customDueTime) : null;
    if (dueChoice === 'custom' && customDue === null) {
      setComposerError('请输入有效日期（YYYY-MM-DD），时间可选（HH:mm）。');
      return;
    }
    setComposerError(null);
    todos.create(
      {
        title: draft,
        stage: filter === 'all' ? 'buffer' : filter,
        dueAt:
          dueChoice === 'custom'
            ? customDue
            : dueChoice === null
              ? null
              : dueDateFromNow(dueChoice),
        dueHasTime: dueChoice === 'custom' && Boolean(customDueTime.trim()),
        recurrence: filter === 'habit' ? 'daily' : recurrence,
      },
      { onSuccess: () => {
        setDraft('');
        setDueChoice(null);
        setCustomDueDate('');
        setCustomDueTime('');
        setRecurrence(null);
      } },
    );
  };
  const measureDropTargets = useCallback(() => {
    dropTargets.current = [];
    for (const stage of todoStages.filter((item) => item !== 'unclassified')) {
      categoryRefs.current[stage]?.measureInWindow((x, y, width, height) => {
        dropTargets.current = [
          ...dropTargets.current.filter((target) => target.stage !== stage),
          { stage, x, y, width, height },
        ];
      });
    }
  }, []);
  const dropTodo = useCallback(
    (todoId: string, absoluteX: number, absoluteY: number) => {
      const stage = findTodoDropStage(dropTargets.current, absoluteX, absoluteY);
      setDraggingTodoId(null);
      if (stage) moveTodo({ todoId, stage });
    },
    [moveTodo],
  );

  return (
    <Screen
      eyebrow="REMINDERS"
      title="待办事项"
      contentStyle={styles.content}
      scrollRef={screenScrollRef}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
      }}>
      <View style={styles.categoryRail}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            ref={(node) => {
              if (item.key !== 'all') categoryRefs.current[item.key] = node;
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.key }}
            onPress={() => {
              setSelectedFilter(item.key);
              filterRef.current = item.key;
            }}
            style={[
              styles.category,
              filter === item.key && styles.categoryActive,
              draggingTodoId && item.key !== 'all' && styles.categoryDropReady,
            ]}>
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
            {group.items.map((todo) => {
              const canDrag = filter === 'all' && todo.stage === 'unclassified';
              return (
              <DraggableTodoSurface
                key={todo.id}
                enabled={canDrag}
                onDragStart={() => {
                  setLinkingTodoId(null);
                  setDraggingTodoId(todo.id);
                  measureDropTargets();
                }}
                onDragFinish={() => setDraggingTodoId(null)}
                onDrop={(absoluteX, absoluteY) =>
                  dropTodo(todo.id, absoluteX, absoluteY)
                }>
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
                      if (canDrag) return;
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
                      {canDrag
                        ? '长按拖入左侧分类'
                        : todo.eventName
                          ? `关联 · ${todo.eventName}`
                          : '未关联计时事件'}
                    </Text>
                    {todo.dueAt ? (
                      <Text style={styles.dueText}>
                        截止 {new Date(todo.dueAt).toLocaleDateString('zh-CN')}
                        {todo.stage === 'habit' ? ' · 每日重复' : ''}
                      </Text>
                    ) : todo.stage === 'habit' ? (
                      <Text style={styles.dueText}>每日重复</Text>
                    ) : null}
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
              </DraggableTodoSurface>
              );
            })}
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
        <View style={styles.duePicker}>
          {[
            { label: '无截止', value: null },
            { label: '今天', value: 0 },
            { label: '明天', value: 1 },
            { label: '7 天后', value: 7 },
          ].map((option) => (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: dueChoice === option.value }}
              onPress={() => setDueChoice(option.value)}
              style={[styles.dueOption, dueChoice === option.value && styles.dueOptionSelected]}>
              <Text style={styles.dueOptionText}>{option.label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dueChoice === 'custom' }}
            onPress={() => setDueChoice('custom')}
            style={[styles.dueOption, dueChoice === 'custom' && styles.dueOptionSelected]}>
            <Text style={styles.dueOptionText}>自定日期</Text>
          </Pressable>
        </View>
        {dueChoice === 'custom' ? (
          <View style={styles.customDueRow}>
            <TextInput accessibilityLabel="截止日期" onChangeText={setCustomDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.customDueInput} value={customDueDate} />
            <TextInput accessibilityLabel="截止时间" onChangeText={setCustomDueTime} placeholder="HH:mm（可选）" placeholderTextColor={colors.textMuted} style={styles.customDueInput} value={customDueTime} />
          </View>
        ) : null}
        {filter !== 'habit' ? (
          <View style={styles.duePicker}>
            {[
              { label: '不重复', value: null },
              { label: '每日重复', value: 'daily' as const },
              { label: '每周重复', value: 'weekly' as const },
            ].map((option) => (
              <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: recurrence === option.value }} onPress={() => setRecurrence(option.value)} style={[styles.dueOption, recurrence === option.value && styles.dueOptionSelected]}>
                <Text style={styles.dueOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {filter === 'habit' ? <Text style={styles.habitHint}>日常习惯会自动设为每日重复。</Text> : null}
        {composerError ? <Text style={styles.composerError}>{composerError}</Text> : null}
      </View>
    </Screen>
  );
}

function filterLabel(filter: Exclude<StageFilter, 'all'>) {
  return todoStageLabels[filter];
}

function dueDateFromNow(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(23, 59, 0, 0);
  return date.getTime();
}

function parseCustomDue(dateValue: string, timeValue: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!dateMatch) return null;
  const timeMatch = timeValue.trim() ? /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim()) : null;
  if (timeValue.trim() && !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = timeMatch ? Number(timeMatch[1]) : 23;
  const minute = timeMatch ? Number(timeMatch[2]) : 59;
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    hour > 23 ||
    minute > 59
  ) return null;
  return date.getTime();
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
  categoryDropReady: {
    borderWidth: 1,
    borderColor: colors.accent,
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
  dueText: {
    color: colors.tomato,
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
  duePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dueOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dueOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dueOptionText: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  habitHint: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  customDueRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customDueInput: {
    flex: 1,
    minHeight: 40,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composerError: {
    color: colors.tomato,
    fontSize: typography.small,
  },
});
