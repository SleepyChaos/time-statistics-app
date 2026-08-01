import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addLocalDays } from '@/domain/time/local-day';
import { clipInterval, type TimeInterval } from '@/domain/time/interval';
import {
  applyTimelineDrag,
  conflictsWithRecords,
  type TimelineDragTarget,
} from '@/domain/timeline/timeline-edit';
import {
  buildScheduleDisplaySegments,
  type ScheduleDisplaySegment,
} from '@/domain/timeline/schedule-overlap';
import type { TimelineSchedule, TimelineSlice } from '@/domain/timeline/timeline';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export const HOUR_HEIGHT = 56;
export const DAY_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

interface DayColumnProps {
  dayStart: number;
  now: number;
  onChangeRecordRange: (
    recordId: string,
    startsAt: number,
    endsAt: number,
    target: TimelineDragTarget,
  ) => void;
  onChangeScheduleTime: (scheduleId: string, startsAt: number, endsAt: number) => void;
  onPressBlank: (timestamp: number) => void;
  onPressRecord: (recordId: string) => void;
  onPressSchedule: (scheduleId: string) => void;
  onPressScheduleOverlap: (schedules: readonly TimelineSchedule[]) => void;
  schedules: readonly TimelineSchedule[];
  slices: readonly TimelineSlice[];
}

export const DayColumn = memo(function DayColumn({
  dayStart,
  now,
  onChangeRecordRange,
  onChangeScheduleTime,
  onPressBlank,
  onPressRecord,
  onPressSchedule,
  onPressScheduleOverlap,
  schedules,
  slices,
}: DayColumnProps) {
  const dayEnd = addLocalDays(dayStart, 1);
  const records = useMemo(() => groupRecordSlices(slices), [slices]);
  const occupied = useMemo(
    () =>
      records.map((record) => ({
        recordId: record.recordId,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
      })),
    [records],
  );
  const visibleRecords = useMemo(
    () =>
      records.filter((record) =>
        clipInterval(record, { startsAt: dayStart, endsAt: dayEnd }),
      ),
    [dayEnd, dayStart, records],
  );
  const visibleSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          !schedule.isAllDay &&
          clipInterval(schedule, { startsAt: dayStart, endsAt: dayEnd }) !== null,
      ),
    [dayEnd, dayStart, schedules],
  );
  const scheduleSegments = useMemo(
    () =>
      buildScheduleDisplaySegments(visibleSchedules, {
        startsAt: dayStart,
        endsAt: dayEnd,
      }),
    [dayEnd, dayStart, visibleSchedules],
  );
  const overlappedScheduleIds = useMemo(
    () =>
      new Set(
        scheduleSegments
          .filter((segment) => segment.schedules.length > 1)
          .flatMap((segment) => segment.schedules.map((schedule) => schedule.id)),
      ),
    [scheduleSegments],
  );

  return (
    <View style={styles.column}>
      <Pressable
        accessibilityLabel="在空白时间补记"
        onPress={(event) =>
          onPressBlank(dayStart + (event.nativeEvent.locationY / HOUR_HEIGHT) * 3_600_000)
        }
        style={StyleSheet.absoluteFill}
      />
      {HOURS.map((hour) => (
        <View
          key={hour}
          pointerEvents="none"
          style={[styles.hourLine, { top: hour * HOUR_HEIGHT }]}>
          <Text style={styles.hourText}>{hour.toString().padStart(2, '0')}:00</Text>
        </View>
      ))}
      {visibleRecords.map((record) => (
        <EditableRecordBlock
          key={record.recordId}
          dayEnd={dayEnd}
          dayStart={dayStart}
          occupied={occupied}
          now={now}
          onChangeRange={onChangeRecordRange}
          onPress={onPressRecord}
          record={record}
        />
      ))}
      {visibleSchedules
        .filter((schedule) => !overlappedScheduleIds.has(schedule.id))
        .map((schedule) => (
        <EditableScheduleBlock
          key={schedule.id}
          dayEnd={dayEnd}
          dayStart={dayStart}
          onChangeTime={onChangeScheduleTime}
          onPress={onPressSchedule}
          schedule={schedule}
        />
      ))}
      {scheduleSegments
        .filter((segment) =>
          segment.schedules.some((schedule) => overlappedScheduleIds.has(schedule.id)),
        )
        .map((segment) => (
          <ScheduleSegmentBlock
            key={segment.key}
            dayStart={dayStart}
            onPress={onPressSchedule}
            onPressOverlap={onPressScheduleOverlap}
            segment={segment}
          />
        ))}
    </View>
  );
});

function ScheduleSegmentBlock({
  dayStart,
  onPress,
  onPressOverlap,
  segment,
}: {
  dayStart: number;
  onPress: (scheduleId: string) => void;
  onPressOverlap: (schedules: readonly TimelineSchedule[]) => void;
  segment: ScheduleDisplaySegment;
}) {
  const { primary } = segment;

  return (
    <View
      style={[
        styles.scheduleBlock,
        blockPosition(segment, dayStart),
        {
          borderColor: primary.colorArgb,
          backgroundColor: colorWithAlpha(
            primary.colorArgb,
            primary.isMarkedNotOccurred ? '26' : '66',
          ),
        },
      ]}>
      <Pressable
        accessibilityLabel={primary.title}
        onPress={(event) => {
          event.stopPropagation();
          onPress(primary.id);
        }}
        style={StyleSheet.absoluteFill}>
        <Text numberOfLines={2} style={[styles.scheduleText, { color: primary.colorArgb }]}>
          {primary.title}
        </Text>
      </Pressable>
      {segment.schedules.length > 1 ? (
        <Pressable
          accessibilityLabel={`展开${segment.schedules.length}条重叠日程`}
          onPress={(event) => {
            event.stopPropagation();
            onPressOverlap(segment.schedules);
          }}
          hitSlop={8}
          style={styles.overlapButton}>
          <Text style={[styles.overlapText, { color: primary.colorArgb }]}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface RecordGroup extends TimeInterval {
  recordId: string;
  eventName: string;
  eventColorArgb: string;
  slices: TimelineSlice[];
}

function EditableRecordBlock({
  dayEnd,
  dayStart,
  occupied,
  now,
  onChangeRange,
  onPress,
  record,
}: {
  dayEnd: number;
  dayStart: number;
  occupied: readonly (TimeInterval & { recordId: string })[];
  now: number;
  onChangeRange: (
    recordId: string,
    startsAt: number,
    endsAt: number,
    target: TimelineDragTarget,
  ) => void;
  onPress: (recordId: string) => void;
  record: RecordGroup;
}) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<TimeInterval | null>(null);
  const [conflicting, setConflicting] = useState(false);
  const longPressed = useRef(false);
  const shown = preview ?? record;
  const visible =
    clipInterval(shown, { startsAt: dayStart, endsAt: dayEnd }) ??
    clipInterval(record, { startsAt: dayStart, endsAt: dayEnd });

  const previewDrag = useCallback(
    (target: TimelineDragTarget, deltaY: number) => {
      const candidate = applyTimelineDrag(record, target, deltaY, HOUR_HEIGHT);
      setPreview(candidate);
      setConflicting(
        candidate.endsAt > now ||
          conflictsWithRecords(candidate, occupied, record.recordId),
      );
    },
    [now, occupied, record],
  );
  const finishDrag = useCallback(
    (target: TimelineDragTarget, deltaY: number) => {
      const candidate = applyTimelineDrag(record, target, deltaY, HOUR_HEIGHT);
      const invalid =
        candidate.endsAt > now ||
        conflictsWithRecords(candidate, occupied, record.recordId);
      if (invalid) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPreview(null);
      setConflicting(false);
      if (invalid) return;
      setEditing(false);
      if (candidate.startsAt !== record.startsAt || candidate.endsAt !== record.endsAt) {
        onChangeRange(record.recordId, candidate.startsAt, candidate.endsAt, target);
      }
    },
    [now, occupied, onChangeRange, record],
  );
  const responders = useMemo(
    () => ({
      body: createDragResponder(
        () => editing,
        (deltaY) => previewDrag('body', deltaY),
        (deltaY) => finishDrag('body', deltaY),
      ),
      start: createDragResponder(
        () => editing,
        (deltaY) => previewDrag('start', deltaY),
        (deltaY) => finishDrag('start', deltaY),
        true,
      ),
      end: createDragResponder(
        () => editing,
        (deltaY) => previewDrag('end', deltaY),
        (deltaY) => finishDrag('end', deltaY),
        true,
      ),
    }),
    [editing, finishDrag, previewDrag],
  );
  if (!visible) return null;

  return (
    <View
      style={[
        styles.recordGroup,
        blockPosition(visible, dayStart),
        editing && styles.editingBlock,
        conflicting && styles.conflictingBlock,
      ]}>
      <Pressable
        accessibilityHint="长按后可拖动"
        accessibilityLabel={`${record.eventName}记录`}
        delayLongPress={350}
        onLongPress={() => {
          longPressed.current = true;
          setEditing(true);
        }}
        onPress={(event) => {
          event.stopPropagation();
          if (longPressed.current) {
            longPressed.current = false;
          } else if (editing) {
            setEditing(false);
            setPreview(null);
          } else {
            onPress(record.recordId);
          }
        }}
        style={StyleSheet.absoluteFill}
        {...(editing ? responders.body.panHandlers : {})}>
        {preview ? (
          <View style={[styles.previewFill, { backgroundColor: record.eventColorArgb }]}>
            <Text numberOfLines={2} style={styles.recordText}>
              {conflicting ? '时间冲突' : record.eventName}
            </Text>
            <Text numberOfLines={1} style={styles.dragTime}>
              {timeFormatter.format(preview.startsAt)}–{timeFormatter.format(preview.endsAt)}
            </Text>
          </View>
        ) : (
          record.slices.map((slice) => {
            const clipped = clipInterval(slice, visible);
            if (!clipped) return null;
            const isEffective = slice.kind === 'effective';
            return (
              <View
                key={slice.id}
                pointerEvents="none"
                style={[
                  styles.sliceFill,
                  relativeBlockPosition(clipped, visible.startsAt),
                  { backgroundColor: isEffective ? record.eventColorArgb : colors.textMuted },
                ]}>
                <Text numberOfLines={1} style={styles.recordText}>
                  {isEffective ? record.eventName : '暂停'}
                </Text>
              </View>
            );
          })
        )}
      </Pressable>
      {editing ? (
        <>
          <View style={styles.topHandle} {...responders.start.panHandlers} />
          <View style={styles.bottomHandle} {...responders.end.panHandlers} />
        </>
      ) : null}
    </View>
  );
}

function EditableScheduleBlock({
  dayEnd,
  dayStart,
  onChangeTime,
  onPress,
  schedule,
}: {
  dayEnd: number;
  dayStart: number;
  onChangeTime: (scheduleId: string, startsAt: number, endsAt: number) => void;
  onPress: (scheduleId: string) => void;
  schedule: TimelineSchedule;
}) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<TimeInterval | null>(null);
  const longPressed = useRef(false);
  const shown = preview ?? schedule;
  const visible =
    clipInterval(shown, { startsAt: dayStart, endsAt: dayEnd }) ??
    clipInterval(schedule, { startsAt: dayStart, endsAt: dayEnd });
  const canEdit = schedule.source === 'local';
  const responders = useMemo(
    () => ({
      start: createDragResponder(
        () => editing,
        (deltaY) => setPreview(applyTimelineDrag(schedule, 'start', deltaY, HOUR_HEIGHT)),
        (deltaY) => {
          const candidate = applyTimelineDrag(schedule, 'start', deltaY, HOUR_HEIGHT);
          setPreview(null);
          setEditing(false);
          onChangeTime(schedule.id, candidate.startsAt, candidate.endsAt);
        },
        true,
      ),
      end: createDragResponder(
        () => editing,
        (deltaY) => setPreview(applyTimelineDrag(schedule, 'end', deltaY, HOUR_HEIGHT)),
        (deltaY) => {
          const candidate = applyTimelineDrag(schedule, 'end', deltaY, HOUR_HEIGHT);
          setPreview(null);
          setEditing(false);
          onChangeTime(schedule.id, candidate.startsAt, candidate.endsAt);
        },
        true,
      ),
    }),
    [editing, onChangeTime, schedule],
  );
  if (!visible) return null;

  return (
    <View
      style={[
        styles.scheduleBlock,
        blockPosition(visible, dayStart),
        editing && styles.editingBlock,
        {
          borderColor: schedule.colorArgb,
          backgroundColor: colorWithAlpha(
            schedule.colorArgb,
            schedule.isMarkedNotOccurred ? '26' : '66',
          ),
        },
      ]}>
      <Pressable
        delayLongPress={350}
        onLongPress={() => {
          if (canEdit) {
            longPressed.current = true;
            setEditing(true);
          }
        }}
        onPress={(event) => {
          event.stopPropagation();
          if (longPressed.current) {
            longPressed.current = false;
          } else if (editing) {
            setEditing(false);
            setPreview(null);
          } else {
            onPress(schedule.id);
          }
        }}
        style={StyleSheet.absoluteFill}>
        <Text numberOfLines={2} style={[styles.scheduleText, { color: schedule.colorArgb }]}>
          {schedule.title}
        </Text>
        {preview ? (
          <Text numberOfLines={1} style={[styles.dragTime, { color: schedule.colorArgb }]}>
            {timeFormatter.format(preview.startsAt)}–{timeFormatter.format(preview.endsAt)}
          </Text>
        ) : null}
      </Pressable>
      {editing ? (
        <>
          <View style={styles.topHandle} {...responders.start.panHandlers} />
          <View style={styles.bottomHandle} {...responders.end.panHandlers} />
        </>
      ) : null}
    </View>
  );
}

function createDragResponder(
  enabled: () => boolean,
  onMove: (deltaY: number) => void,
  onRelease: (deltaY: number) => void,
  captureImmediately = false,
) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => captureImmediately && enabled(),
    onMoveShouldSetPanResponder: (_, gesture) => enabled() && Math.abs(gesture.dy) > 2,
    onPanResponderMove: (_, gesture) => onMove(gesture.dy),
    onPanResponderRelease: (_, gesture) => onRelease(gesture.dy),
    onPanResponderTerminate: (_, gesture) => onRelease(gesture.dy),
    onPanResponderTerminationRequest: () => false,
  });
}

function groupRecordSlices(slices: readonly TimelineSlice[]) {
  const records = new Map<string, RecordGroup>();
  for (const slice of slices) {
    const existing = records.get(slice.recordId);
    if (existing) {
      existing.slices.push(slice);
    } else {
      records.set(slice.recordId, {
        recordId: slice.recordId,
        eventName: slice.eventName,
        eventColorArgb: slice.eventColorArgb,
        startsAt: slice.recordStartsAt,
        endsAt: slice.recordEndsAt,
        slices: [slice],
      });
    }
  }
  return [...records.values()];
}

function blockPosition(interval: TimeInterval, dayStart: number) {
  return {
    top: ((interval.startsAt - dayStart) / 3_600_000) * HOUR_HEIGHT,
    height: Math.max(3, ((interval.endsAt - interval.startsAt) / 3_600_000) * HOUR_HEIGHT),
  };
}

function relativeBlockPosition(interval: TimeInterval, startsAt: number) {
  return {
    top: ((interval.startsAt - startsAt) / 3_600_000) * HOUR_HEIGHT,
    height: Math.max(3, ((interval.endsAt - interval.startsAt) / 3_600_000) * HOUR_HEIGHT),
  };
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
  recordGroup: {
    position: 'absolute',
    left: 38,
    width: '30%',
    minHeight: 5,
    overflow: 'visible',
    borderRadius: radii.md,
  },
  sliceFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    padding: 3,
    borderRadius: radii.md,
  },
  previewFill: {
    flex: 1,
    overflow: 'hidden',
    padding: 3,
    borderRadius: radii.md,
  },
  recordText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dragTime: {
    color: '#FFFFFF',
    fontSize: 8,
    fontVariant: ['tabular-nums'],
  },
  scheduleBlock: {
    position: 'absolute',
    left: '68%',
    right: 3,
    minHeight: 5,
    overflow: 'visible',
    padding: 3,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  scheduleText: {
    fontSize: typography.small,
    fontWeight: '700',
  },
  overlapButton: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  overlapText: {
    fontSize: typography.body,
    fontWeight: '900',
    lineHeight: 18,
  },
  editingBlock: {
    zIndex: 20,
    borderWidth: 2,
    borderColor: colors.text,
  },
  conflictingBlock: {
    opacity: 0.65,
    borderColor: colors.tomato,
    backgroundColor: colors.tomato,
  },
  topHandle: {
    position: 'absolute',
    top: -7,
    left: 2,
    right: 2,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.text,
  },
  bottomHandle: {
    position: 'absolute',
    bottom: -7,
    left: 2,
    right: 2,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.text,
  },
});
