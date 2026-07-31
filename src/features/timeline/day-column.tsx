import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { addLocalDays } from '@/domain/time/local-day';
import { clipInterval } from '@/domain/time/interval';
import type { TimelineSchedule, TimelineSlice } from '@/domain/timeline/timeline';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export const HOUR_HEIGHT = 56;
export const DAY_HEIGHT = HOUR_HEIGHT * 24;

interface DayColumnProps {
  dayStart: number;
  schedules: readonly TimelineSchedule[];
  slices: readonly TimelineSlice[];
}

export const DayColumn = memo(function DayColumn({
  dayStart,
  schedules,
  slices,
}: DayColumnProps) {
  const dayEnd = addLocalDays(dayStart, 1);
  const visibleSlices = useMemo(
    () =>
      slices
        .map((slice) => ({
          slice,
          interval: clipInterval(slice, { startsAt: dayStart, endsAt: dayEnd }),
        }))
        .filter(
          (
            value,
          ): value is {
            slice: TimelineSlice;
            interval: { startsAt: number; endsAt: number };
          } => value.interval !== null,
        ),
    [dayEnd, dayStart, slices],
  );
  const visibleSchedules = useMemo(
    () =>
      schedules
        .filter((schedule) => !schedule.isAllDay)
        .map((schedule) => ({
          schedule,
          interval: clipInterval(schedule, { startsAt: dayStart, endsAt: dayEnd }),
        }))
        .filter(
          (
            value,
          ): value is {
            schedule: TimelineSchedule;
            interval: { startsAt: number; endsAt: number };
          } => value.interval !== null,
        ),
    [dayEnd, dayStart, schedules],
  );

  return (
    <View style={styles.column}>
      {Array.from({ length: 24 }, (_, hour) => (
        <View key={hour} style={[styles.hourLine, { top: hour * HOUR_HEIGHT }]}>
          <Text style={styles.hourText}>{hour.toString().padStart(2, '0')}:00</Text>
        </View>
      ))}
      {visibleSlices.map(({ interval, slice }) => {
        const isEffective = slice.kind === 'effective';
        return (
          <View
            key={slice.id}
            style={[
              styles.recordBlock,
              blockPosition(interval, dayStart),
              { backgroundColor: isEffective ? slice.eventColorArgb : colors.textMuted },
            ]}>
            <Text numberOfLines={2} style={styles.recordText}>
              {isEffective ? slice.eventName : '暂停'}
            </Text>
          </View>
        );
      })}
      {visibleSchedules.map(({ interval, schedule }) => (
        <View
          key={schedule.id}
          style={[
            styles.scheduleBlock,
            blockPosition(interval, dayStart),
            {
              borderColor: schedule.colorArgb,
              backgroundColor: colorWithAlpha(
                schedule.colorArgb,
                schedule.isMarkedNotOccurred ? '26' : '66',
              ),
            },
          ]}>
          <Text
            numberOfLines={2}
            style={[styles.scheduleText, { color: schedule.colorArgb }]}>
            {schedule.title}
          </Text>
        </View>
      ))}
    </View>
  );
});

function blockPosition(interval: { startsAt: number; endsAt: number }, dayStart: number) {
  const top = ((interval.startsAt - dayStart) / 3_600_000) * HOUR_HEIGHT;
  const height = Math.max(3, ((interval.endsAt - interval.startsAt) / 3_600_000) * HOUR_HEIGHT);
  return { top, height };
}

function colorWithAlpha(color: string, alpha: string) {
  return /^#[0-9A-F]{6}$/i.test(color) ? `${color}${alpha}` : colors.accentMuted;
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    height: DAY_HEIGHT,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    paddingTop: spacing.xs,
    paddingLeft: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hourText: {
    color: colors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  recordBlock: {
    position: 'absolute',
    left: 38,
    width: '30%',
    minHeight: 3,
    overflow: 'hidden',
    padding: 3,
    borderRadius: radii.md,
  },
  recordText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleBlock: {
    position: 'absolute',
    left: '68%',
    right: 3,
    minHeight: 3,
    overflow: 'hidden',
    padding: 3,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  scheduleText: {
    fontSize: typography.small,
    fontWeight: '700',
  },
});
