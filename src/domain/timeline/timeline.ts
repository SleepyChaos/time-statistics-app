import { calculateUtilization, type TimeInterval } from '@/domain/time/interval';
import type { TimeSliceKind } from '@/domain/timer/active-timer';

export interface TimelineSlice {
  id: string;
  recordId: string;
  kind: TimeSliceKind;
  startsAt: number;
  endsAt: number;
  eventName: string;
  eventColorArgb: string;
  todoTitle: string | null;
}

export interface TimelineSchedule {
  id: string;
  title: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  colorArgb: string;
  isMarkedNotOccurred: boolean;
}

export interface ViewUtilization {
  effectiveMs: number;
  elapsedMs: number;
  ratio: number;
}

export function calculateViewUtilization(input: {
  effectiveSlices: readonly TimeInterval[];
  schedules: readonly TimelineSchedule[];
  window: TimeInterval;
  now: number;
}): ViewUtilization {
  const occurredSchedules = input.schedules
    .filter(
      (schedule) =>
        !schedule.isMarkedNotOccurred &&
        !schedule.isAllDay &&
        schedule.startsAt < input.now,
    )
    .map((schedule) => ({
      startsAt: schedule.startsAt,
      endsAt: Math.min(schedule.endsAt, input.now),
    }))
    .filter((interval) => interval.endsAt > interval.startsAt);

  return calculateUtilization(
    [...input.effectiveSlices, ...occurredSchedules],
    input.window,
    input.now,
  );
}

