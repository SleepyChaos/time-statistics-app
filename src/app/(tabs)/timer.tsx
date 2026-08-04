import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CurrentClock } from '@/features/timer/current-clock';
import { ElapsedTime } from '@/features/timer/elapsed-time';
import { useTimerController } from '@/features/timer/use-timer-controller';
import { EventArcSelector } from '@/features/timer/event-arc-selector';
import { RollingTimeArc } from '@/features/timer/rolling-time-arc';
import { useActiveEvents } from '@/features/events/use-active-events';
import { useTodos } from '@/features/todos/use-todos';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';
import { pomodoroRemainingMs } from '@/domain/timer/active-timer';

export default function TimerScreen() {
  const params = useLocalSearchParams<{
    eventId?: string;
    todoId?: string;
    todoTitle?: string;
  }>();
  const router = useRouter();
  const eventsQuery = useActiveEvents();
  const todosModel = useTodos();
  const timer = useTimerController();
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<{ id: string; title: string } | null>(null);
  const [reflection, setReflection] = useState('');
  const [completeTodo, setCompleteTodo] = useState(false);
  const [backdatedStartAt, setBackdatedStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestedEventId = singleParam(params.eventId);

  const selectedEvent = useMemo(
    () =>
      events.find((event) => event.id === selectedEventId) ??
      events.find((event) => event.id === requestedEventId) ??
      events[0] ??
      null,
    [events, requestedEventId, selectedEventId],
  );
  const displayedEventName = timer.activeTimer?.eventName ?? selectedEvent?.name ?? '加载事件';
  const pomodoroRemaining = timer.activeTimer
    ? pomodoroRemainingMs(timer.activeTimer, now)
    : null;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), timer.activeTimer?.mode === 'pomodoro' ? 1_000 : 60_000);
    return () => clearInterval(interval);
  }, [timer.activeTimer?.mode]);

  return (
    <Screen eyebrow="NOW" title="时间刻度">
      <View style={styles.timeline}>
        <RollingTimeArc
          disabled={Boolean(timer.activeTimer)}
          now={now}
          onBackdateChange={setBackdatedStartAt}>
          {timer.activeTimer ? <ElapsedTime timer={timer.activeTimer} /> : <CurrentClock />}
          {timer.activeTimer && !timer.activeTimer.pendingEndAt ? (
            <Text style={styles.status}>
              {timer.activeTimer.status === 'paused' ? '已暂停' : '计时中'}
            </Text>
          ) : timer.activeTimer?.pendingEndAt ? (
            <Text style={styles.status}>等待保存</Text>
          ) : null}
        </RollingTimeArc>
      </View>

      <View style={styles.message}>
        <Text style={styles.messageText}>
          {timer.activeTimer ? displayedEventName : '记录是为了看见，而不是为了控制。'}
        </Text>
        {timer.error ? <Text style={styles.error}>{readableError(timer.error)}</Text> : null}
      </View>

      <View style={styles.selector}>
        <Text style={styles.selectorLabel}>
          {selectedEvent ? `${selectedEvent.categoryName} → ${displayedEventName}` : displayedEventName}
        </Text>
        {selectedTodo ? <Text style={styles.todoSelection}>待办：{selectedTodo.title}</Text> : null}
        {timer.activeTimer?.mode === 'pomodoro' ? (
          <Text style={styles.todoSelection}>
            {timer.activeTimer.phase === 'focus' ? '专注' : timer.activeTimer.phase === 'long-break' ? '长休息' : '短休息'}
            {' · 第 '}{timer.activeTimer.round} 轮
          </Text>
        ) : null}
        <EventArcSelector
          events={events}
          initialEventId={requestedEventId}
          isLocked={Boolean(timer.activeTimer && !timer.activeTimer.pendingEndAt)}
          onAdd={() => router.push('/event-management')}
          onSelect={({ event, todo }) => {
            setSelectedEventId(event.id);
            setSelectedTodo(todo ? { id: todo.id, title: todo.title } : null);
            if (timer.activeTimer && !timer.activeTimer.pendingEndAt) {
              timer.switchEvent(event.id);
            }
          }}
          todos={todosModel.todos}
        />
        {timer.activeTimer?.pendingEndAt ? (
          <View style={styles.finishCard}>
            <Text style={styles.finishTitle}>这段时间已经结束</Text>
            <TextInput
              accessibilityLabel="本次计时心得"
              multiline
              onChangeText={setReflection}
              placeholder="写一点心得（可选）"
              placeholderTextColor={colors.textMuted}
              style={styles.reflectionInput}
              value={reflection}
            />
            {timer.activeTimer.todoId ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completeTodo }}
                onPress={() => setCompleteTodo((value) => !value)}
                style={styles.completeRow}>
                <View style={[styles.confirmCheckbox, completeTodo && styles.checkboxChecked]} />
                <Text style={styles.completeText}>
                  同时将“{timer.activeTimer.todoTitle ?? '关联待办'}”标记为完成
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={timer.isMutating}
                onPress={() => timer.discard()}
                style={[styles.button, styles.discardButton]}>
                <Text style={styles.discardText}>丢弃</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={timer.isMutating}
                onPress={() => timer.save({ reflection, completeTodo })}
                style={[styles.button, styles.normalButton]}>
                <Text style={styles.buttonText}>保存记录</Text>
              </Pressable>
            </View>
          </View>
        ) : timer.activeTimer ? (
          <View style={styles.actions}>
            {timer.activeTimer.mode === 'pomodoro' && pomodoroRemaining !== null && pomodoroRemaining <= 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={timer.isMutating}
                onPress={() => timer.advancePomodoro()}
                style={[styles.button, styles.pomodoroButton]}>
                <Text style={styles.buttonText}>确认下一阶段</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={timer.isMutating}
              onPress={timer.activeTimer.status === 'paused' ? () => timer.resume() : () => timer.pause()}
              style={[styles.button, styles.pauseButton]}>
              <Text style={styles.buttonText}>
                {timer.activeTimer.status === 'paused' ? '继续' : '暂停'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={timer.isMutating}
              onPress={() => timer.requestEnd()}
              style={[styles.button, styles.stopButton]}>
              <Text style={styles.buttonText}>结束</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={!selectedEvent || timer.isMutating}
              onPress={() =>
                selectedEvent &&
                timer.start({
                  mode: 'normal',
                  eventId: selectedEvent.id,
                  startsAt: backdatedStartAt ?? undefined,
                  todoId: selectedTodo?.id ?? singleParam(params.todoId),
                  todoTitle: selectedTodo?.title ?? singleParam(params.todoTitle),
                })
              }
              style={[styles.button, styles.normalButton]}>
              <Text style={styles.buttonText}>常规计时</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!selectedEvent || timer.isMutating}
              onPress={() =>
                selectedEvent &&
                timer.start({
                  mode: 'pomodoro',
                  eventId: selectedEvent.id,
                  startsAt: backdatedStartAt ?? undefined,
                  todoId: selectedTodo?.id ?? singleParam(params.todoId),
                  todoTitle: selectedTodo?.title ?? singleParam(params.todoTitle),
                })
              }
              style={[styles.button, styles.pomodoroButton]}>
              <Text style={styles.buttonText}>番茄钟</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readableError(error: Error) {
  const messages: Record<string, string> = {
    TIMER_ALREADY_ACTIVE: '已有计时正在进行。',
    TIME_RECORD_OVERLAP: '开始时间与已有记录重叠。',
    EVENT_NOT_FOUND: '当前事件已不可用，请重新选择。',
    SYSTEM_CLOCK_MOVED_BACKWARD: '检测到系统时间变化，请重新确认计时。',
  };
  return messages[error.message] ?? '操作失败，请稍后重试。';
}

const styles = StyleSheet.create({
  timeline: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  arc: {
    width: '88%',
    height: 132,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    color: colors.accent,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
  error: {
    color: colors.tomato,
    fontSize: typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  selector: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  todoSelection: {
    color: colors.accent,
    fontSize: typography.small,
    textAlign: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  eventChip: {
    minHeight: 36,
    maxWidth: 128,
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
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  eventChipText: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  eventChipTextSelected: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  finishCard: {
    gap: spacing.md,
  },
  finishTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  reflectionInput: {
    minHeight: 88,
    color: colors.text,
    fontSize: typography.body,
    padding: spacing.md,
    textAlignVertical: 'top',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  completeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  button: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  normalButton: {
    backgroundColor: colors.accent,
  },
  pomodoroButton: {
    backgroundColor: colors.tomato,
  },
  pauseButton: {
    backgroundColor: colors.accent,
  },
  stopButton: {
    backgroundColor: colors.tomato,
  },
  discardButton: {
    borderWidth: 1,
    borderColor: colors.tomato,
  },
  discardText: {
    color: colors.tomato,
    fontSize: typography.body,
    fontWeight: '700',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '700',
  },
});
