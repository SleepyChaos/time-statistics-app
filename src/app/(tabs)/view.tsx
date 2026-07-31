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

export default function ViewScreen() {
  const [now, setNow] = useState(() => Date.now());
  const todayStart = startOfLocalDay(now);
  const [rightDayStart, setRightDayStart] = useState(todayStart);
  const [subview, setSubview] = useState<Subview>('schedule');
  const scrollRef = useRef<ScrollView>(null);
  const timeline = useTimeline(rightDayStart, now);
  const leftDayStart = addLocalDays(rightDayStart, -1);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSubview('schedule');
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

  const snapshot = timeline.data;
  const utilization = snapshot?.utilization;

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
              showsVerticalScrollIndicator={false}
              style={styles.timelineScroll}>
              <View style={styles.columns}>
                <DayColumn
                  dayStart={leftDayStart}
                  schedules={snapshot?.schedules ?? []}
                  slices={snapshot?.slices ?? []}
                />
                <DayColumn
                  dayStart={rightDayStart}
                  schedules={snapshot?.schedules ?? []}
                  slices={snapshot?.slices ?? []}
                />
              </View>
            </ScrollView>
          </View>
          {timeline.isLoading ? <Text style={styles.status}>正在读取时间记录…</Text> : null}
          {timeline.error ? <Text style={styles.error}>时间轴读取失败，请稍后重试。</Text> : null}
        </>
      ) : (
        <StatisticsSummary
          effectiveMs={utilization?.effectiveMs ?? 0}
          elapsedMs={utilization?.elapsedMs ?? 0}
          ratio={utilization?.ratio ?? 0}
        />
      )}
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
