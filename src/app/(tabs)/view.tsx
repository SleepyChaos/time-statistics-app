import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addLocalDays,
  defaultVisibleStartHour,
  startOfLocalDay,
} from '@/domain/time/local-day';
import type { BackfillDraft } from '@/domain/history/history-record';
import type { TimelineDragTarget } from '@/domain/timeline/timeline-edit';
import { FIVE_MINUTES_MS, snapForwardToFiveMinutes } from '@/domain/time/snap';
import { BackfillCard } from '@/features/history/backfill-card';
import { RecordDetailCard } from '@/features/history/record-detail-card';
import {
  useHistoryActions,
  useHistoryRecordDetail,
} from '@/features/history/use-history';
import { useActiveEvents } from '@/features/events/use-active-events';
import {
  CreateScheduleCard,
  ScheduleDetailCard,
} from '@/features/schedules/schedule-cards';
import {
  useScheduleActions,
  useScheduleDetail,
} from '@/features/schedules/use-schedules';
import { DayColumn, DAY_HEIGHT, HOUR_HEIGHT } from '@/features/timeline/day-column';
import { useTimeline } from '@/features/timeline/use-timeline';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const VISIBLE_HEIGHT = HOUR_HEIGHT * 6;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

type Subview = 'schedule' | 'statistics';
interface ScheduleDraft {
  startsAt: number;
  endsAt: number;
}

export default function ViewScreen() {
  const [now, setNow] = useState(() => Date.now());
  const todayStart = startOfLocalDay(now);
  const [rightDayStart, setRightDayStart] = useState(todayStart);
  const [subview, setSubview] = useState<Subview>('schedule');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [backfillDraft, setBackfillDraft] = useState<BackfillDraft | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(defaultVisibleStartHour(now) * HOUR_HEIGHT);
  const timeline = useTimeline(rightDayStart, now);
  const {
    createBackfill,
    deleteRecord,
    error: historyError,
    isMutating: isHistoryMutating,
    prepareBackfill: prepareBackfillMutation,
    updateRange,
    updateRecord,
  } = useHistoryActions();
  const {
    create: createSchedule,
    error: scheduleError,
    isMutating: isScheduleMutating,
    markOccurrence,
    updateTime: updateScheduleTime,
  } = useScheduleActions();
  const scheduleDetail = useScheduleDetail(selectedScheduleId);
  const detail = useHistoryRecordDetail(selectedRecordId);
  const eventsQuery = useActiveEvents();
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const leftDayStart = addLocalDays(rightDayStart, -1);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSubview('schedule');
      setSelectedRecordId(null);
      setBackfillDraft(null);
      setSelectedScheduleId(null);
      setScheduleDraft(null);
    }, []),
  );

  const changeDay = useCallback((amount: number) => {
    setRightDayStart((current) => addLocalDays(current, amount));
  }, []);
  const datePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 45) changeDay(-1);
          if (gesture.dx < -45) changeDay(1);
        },
      }),
    [changeDay],
  );

  const returnToNow = () => {
    setRightDayStart(todayStart);
    scrollRef.current?.scrollTo({
      y: defaultVisibleStartHour(now) * HOUR_HEIGHT,
      animated: true,
    });
  };
  const openRecord = useCallback((recordId: string) => {
    setBackfillDraft(null);
    setSelectedScheduleId(null);
    setScheduleDraft(null);
    setSelectedRecordId(recordId);
  }, []);
  const openSchedule = useCallback((scheduleId: string) => {
    setSelectedRecordId(null);
    setBackfillDraft(null);
    setScheduleDraft(null);
    setSelectedScheduleId(scheduleId);
  }, []);
  const prepareBackfill = useCallback(
    (timestamp: number) => {
      setSelectedRecordId(null);
      setSelectedScheduleId(null);
      setScheduleDraft(null);
      prepareBackfillMutation(timestamp, {
        onSuccess: (draft) => setBackfillDraft(draft),
      });
    },
    [prepareBackfillMutation],
  );
  const prepareSchedule = () => {
    const centerHours = scrollOffsetRef.current / HOUR_HEIGHT + 3;
    const startsAt = snapForwardToFiveMinutes(
      rightDayStart + centerHours * 3_600_000,
    );
    setSelectedRecordId(null);
    setBackfillDraft(null);
    setSelectedScheduleId(null);
    setScheduleDraft({ startsAt, endsAt: startsAt + 6 * FIVE_MINUTES_MS });
  };
  const changeRecordRange = useCallback(
    (recordId: string, startsAt: number, endsAt: number, target: TimelineDragTarget) => {
      updateRange({ recordId, startsAt, endsAt, target });
    },
    [updateRange],
  );
  const changeScheduleTime = useCallback(
    (id: string, startsAt: number, endsAt: number) => {
      updateScheduleTime({ id, startsAt, endsAt });
    },
    [updateScheduleTime],
  );

  const snapshot = timeline.data;
  const utilization = snapshot?.utilization;
  const selectedSchedule = scheduleDetail.data;

  return (
    <Screen
      contentStyle={styles.screenContent}
      eyebrow="VIEW"
      scrollEnabled={false}
      title="日程">
      <View style={styles.segment}>
        <SegmentButton
          active={subview === 'schedule'}
          label="日程"
          onPress={() => setSubview('schedule')}
        />
        <SegmentButton
          active={subview === 'statistics'}
          label="统计"
          onPress={() => setSubview('statistics')}
        />
      </View>

      <View style={styles.dateBar} {...datePanResponder.panHandlers}>
        <Pressable accessibilityLabel="前一天" onPress={() => changeDay(-1)} hitSlop={8}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <View style={styles.datePair}>
          <Text style={styles.dateText}>{dateFormatter.format(leftDayStart)}</Text>
          <Text style={styles.dateText}>{dateFormatter.format(rightDayStart)}</Text>
        </View>
        <View style={styles.utilizationBadge}>
          <Text style={styles.utilizationLabel}>利用率</Text>
          <Text style={styles.utilizationValue}>
            {utilization ? `${Math.round(utilization.ratio * 100)}%` : '—'}
          </Text>
        </View>
        <Pressable accessibilityLabel="后一天" onPress={() => changeDay(1)} hitSlop={8}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {subview === 'schedule' ? (
        <>
          <View style={styles.legend}>
            <Text style={styles.legendActual}>■ 实际记录</Text>
            <Text style={styles.legendPlan}>□ 日程</Text>
            <Pressable accessibilityRole="button" onPress={prepareSchedule}>
              <Text style={styles.addSchedule}>＋日程</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={returnToNow}>
              <Text style={styles.nowButton}>回到现在</Text>
            </Pressable>
          </View>
          <View style={styles.timelineFrame}>
            <ScrollView
              ref={scrollRef}
              bounces={false}
              contentOffset={{ x: 0, y: defaultVisibleStartHour(now) * HOUR_HEIGHT }}
              nestedScrollEnabled
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={32}
              showsVerticalScrollIndicator={false}
              style={styles.timelineScroll}>
              <View style={styles.columns}>
                <DayColumn
                  dayStart={leftDayStart}
                  now={now}
                  onChangeRecordRange={changeRecordRange}
                  onChangeScheduleTime={changeScheduleTime}
                  onPressBlank={prepareBackfill}
                  onPressRecord={openRecord}
                  onPressSchedule={openSchedule}
                  schedules={snapshot?.schedules ?? []}
                  slices={snapshot?.slices ?? []}
                />
                <DayColumn
                  dayStart={rightDayStart}
                  now={now}
                  onChangeRecordRange={changeRecordRange}
                  onChangeScheduleTime={changeScheduleTime}
                  onPressBlank={prepareBackfill}
                  onPressRecord={openRecord}
                  onPressSchedule={openSchedule}
                  schedules={snapshot?.schedules ?? []}
                  slices={snapshot?.slices ?? []}
                />
              </View>
            </ScrollView>
          </View>
          {timeline.isLoading ? <Text style={styles.status}>正在读取时间记录…</Text> : null}
          {timeline.error ? <Text style={styles.error}>时间轴读取失败，请稍后重试。</Text> : null}
          {historyError ? (
            <Text style={styles.error}>{readableHistoryError(historyError)}</Text>
          ) : null}
          {scheduleError ? (
            <Text style={styles.error}>{readableScheduleError(scheduleError)}</Text>
          ) : null}
        </>
      ) : (
        <StatisticsSummary
          effectiveMs={utilization?.effectiveMs ?? 0}
          elapsedMs={utilization?.elapsedMs ?? 0}
          ratio={utilization?.ratio ?? 0}
        />
      )}
      {detail.data ? (
        <View style={styles.cardOverlay}>
          <RecordDetailCard
            detail={detail.data}
            events={events}
            isMutating={isHistoryMutating}
            onClose={() => setSelectedRecordId(null)}
            onDelete={() => {
              if (selectedRecordId) {
                deleteRecord(selectedRecordId, {
                  onSuccess: () => setSelectedRecordId(null),
                });
              }
            }}
            onUpdate={(input, onSuccess) =>
              updateRecord(input, {
                onSuccess,
              })
            }
          />
        </View>
      ) : null}
      {backfillDraft ? (
        <View style={styles.cardOverlay}>
          <BackfillCard
            key={backfillDraft.startsAt}
            draft={backfillDraft}
            events={events}
            isMutating={isHistoryMutating}
            onClose={() => setBackfillDraft(null)}
            onSave={(input) =>
              createBackfill(input, {
                onSuccess: (recordId) => {
                  setBackfillDraft(null);
                  setSelectedRecordId(recordId);
                },
              })
            }
          />
        </View>
      ) : null}
      {selectedSchedule ? (
        <View style={styles.cardOverlay}>
          <ScheduleDetailCard
            detail={selectedSchedule}
            isMutating={isScheduleMutating}
            now={now}
            onClose={() => setSelectedScheduleId(null)}
            onToggleOccurred={() =>
              markOccurrence(
                {
                  id: selectedSchedule.id,
                  occurrenceStartsAt: selectedSchedule.startsAt,
                  occurred: selectedSchedule.isMarkedNotOccurred,
                },
              )
            }
          />
        </View>
      ) : null}
      {scheduleDraft ? (
        <View style={styles.cardOverlay}>
          <CreateScheduleCard
            key={scheduleDraft.startsAt}
            initialEndsAt={scheduleDraft.endsAt}
            initialStartsAt={scheduleDraft.startsAt}
            isMutating={isScheduleMutating}
            onClose={() => setScheduleDraft(null)}
            onSave={(input) =>
              createSchedule(input, {
                onSuccess: (schedule) => {
                  setScheduleDraft(null);
                  setSelectedScheduleId(schedule.id);
                },
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentActiveText]}>{label}</Text>
    </Pressable>
  );
}

function StatisticsSummary({
  effectiveMs,
  elapsedMs,
  ratio,
}: {
  effectiveMs: number;
  elapsedMs: number;
  ratio: number;
}) {
  return (
    <View style={styles.statistics}>
      <Text style={styles.statisticsEyebrow}>昨天 00:00 至现在</Text>
      <Text style={styles.statisticsRatio}>{Math.round(ratio * 100)}%</Text>
      <View style={styles.statisticsRow}>
        <Metric label="有效时间" value={formatHours(effectiveMs)} />
        <Metric label="已经过去" value={formatHours(elapsedMs)} />
      </View>
      <Text style={styles.statisticsHint}>计时记录与已发生日程按时间并集合并，不重复计算。</Text>
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

function formatHours(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  return `${Math.floor(totalMinutes / 60)}小时${totalMinutes % 60}分`;
}

function readableHistoryError(error: Error) {
  const messages: Record<string, string> = {
    BACKFILL_FUTURE_NOT_ALLOWED: '只能补记已经过去的空白时间。',
    TIME_RECORD_OVERLAP: '这里已有计时记录，不能重复补记。',
    NO_BACKFILL_SPACE: '这里没有可用于补记的空白时间。',
    EVENT_NOT_FOUND: '没有可用事件，请先在设置中创建事件。',
    INVALID_TIME_RANGE: '结束时间必须晚于开始时间，且不能超过当前时刻。',
  };
  return messages[error.message] ?? '历史记录操作失败，请稍后重试。';
}

function readableScheduleError(error: Error) {
  const messages: Record<string, string> = {
    SCHEDULE_TITLE_REQUIRED: '请输入日程标题。',
    INVALID_TIME_RANGE: '日程结束时间必须晚于开始时间。',
  };
  return messages[error.message] ?? '日程操作失败，请稍后重试。';
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  segmentItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  segmentActive: {
    backgroundColor: colors.surfaceRaised,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  segmentActiveText: {
    color: colors.text,
    fontWeight: '700',
  },
  dateBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrow: {
    color: colors.textSecondary,
    fontSize: 30,
  },
  datePair: {
    flex: 1,
    flexDirection: 'row',
  },
  dateText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  utilizationBadge: {
    alignItems: 'flex-end',
  },
  utilizationLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },
  utilizationValue: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendActual: {
    color: colors.accent,
    fontSize: typography.small,
  },
  legendPlan: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  addSchedule: {
    color: colors.tomato,
    fontSize: typography.small,
  },
  nowButton: {
    color: colors.accent,
    fontSize: typography.small,
    marginLeft: 'auto',
  },
  timelineFrame: {
    height: VISIBLE_HEIGHT,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineScroll: {
    height: VISIBLE_HEIGHT,
  },
  columns: {
    height: DAY_HEIGHT,
    flexDirection: 'row',
  },
  status: {
    color: colors.textMuted,
    fontSize: typography.small,
    textAlign: 'center',
  },
  error: {
    color: colors.tomato,
    fontSize: typography.small,
    textAlign: 'center',
  },
  cardOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 20,
  },
  statistics: {
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statisticsEyebrow: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  statisticsRatio: {
    color: colors.accent,
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  statisticsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  metric: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  statisticsHint: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 21,
    textAlign: 'center',
  },
});
