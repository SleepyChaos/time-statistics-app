import { clipInterval, type TimeInterval } from '@/domain/time/interval';
import type { TimelineSchedule } from '@/domain/timeline/timeline';

export interface ScheduleDisplaySegment extends TimeInterval {
  key: string;
  primary: TimelineSchedule;
  schedules: readonly TimelineSchedule[];
}

export function buildScheduleDisplaySegments(
  schedules: readonly TimelineSchedule[],
  window: TimeInterval,
): ScheduleDisplaySegment[] {
  const clipped = schedules
    .filter((schedule) => !schedule.isAllDay)
    .map((schedule) => ({ schedule, interval: clipInterval(schedule, window) }))
    .filter(
      (entry): entry is { schedule: TimelineSchedule; interval: TimeInterval } =>
        entry.interval !== null,
    )
    .sort((left, right) => compareSchedules(left.schedule, right.schedule));
  const boundaries = [
    ...new Set(clipped.flatMap(({ interval }) => [interval.startsAt, interval.endsAt])),
  ].sort((left, right) => left - right);
  const segments: ScheduleDisplaySegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startsAt = boundaries[index];
    const endsAt = boundaries[index + 1];
    const active = clipped
      .filter(({ interval }) => interval.startsAt < endsAt && interval.endsAt > startsAt)
      .map(({ schedule }) => schedule);
    if (active.length === 0) continue;

    const signature = active.map((schedule) => schedule.id).join('|');
    const previous = segments.at(-1);
    if (
      previous &&
      previous.endsAt === startsAt &&
      previous.schedules.map((schedule) => schedule.id).join('|') === signature
    ) {
      previous.endsAt = endsAt;
      continue;
    }

    segments.push({
      key: `${startsAt}-${endsAt}-${signature}`,
      startsAt,
      endsAt,
      primary: active[0],
      schedules: active,
    });
  }

  return segments;
}

function compareSchedules(left: TimelineSchedule, right: TimelineSchedule) {
  return (
    left.startsAt - right.startsAt ||
    left.endsAt - right.endsAt ||
    left.id.localeCompare(right.id)
  );
}
