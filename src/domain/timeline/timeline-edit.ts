import { FIVE_MINUTES_MS, snapInDragDirection } from '@/domain/time/snap';
import { intervalsOverlap, type TimeInterval } from '@/domain/time/interval';

export type TimelineDragTarget = 'body' | 'start' | 'end';

export function pixelsToMilliseconds(deltaY: number, hourHeight: number) {
  if (!Number.isFinite(deltaY) || !Number.isFinite(hourHeight) || hourHeight <= 0) {
    throw new Error('INVALID_DRAG_VALUE');
  }
  return (deltaY / hourHeight) * 60 * 60 * 1000;
}

export function applyTimelineDrag(
  interval: TimeInterval,
  target: TimelineDragTarget,
  deltaY: number,
  hourHeight: number,
  minimumDurationMs = FIVE_MINUTES_MS,
): TimeInterval {
  const deltaMs = pixelsToMilliseconds(deltaY, hourHeight);
  if (deltaMs === 0) return { ...interval };
  const direction = deltaMs > 0 ? 'later' : 'earlier';

  if (target === 'body') {
    const startsAt = snapInDragDirection(interval.startsAt + deltaMs, direction);
    const actualDelta = startsAt - interval.startsAt;
    return { startsAt, endsAt: interval.endsAt + actualDelta };
  }
  if (target === 'start') {
    const startsAt = Math.min(
      snapInDragDirection(interval.startsAt + deltaMs, direction),
      interval.endsAt - minimumDurationMs,
    );
    return { startsAt, endsAt: interval.endsAt };
  }
  const endsAt = Math.max(
    snapInDragDirection(interval.endsAt + deltaMs, direction),
    interval.startsAt + minimumDurationMs,
  );
  return { startsAt: interval.startsAt, endsAt };
}

export function conflictsWithRecords(
  candidate: TimeInterval,
  occupied: readonly (TimeInterval & { recordId: string })[],
  currentRecordId: string,
) {
  return occupied.some(
    (interval) =>
      interval.recordId !== currentRecordId && intervalsOverlap(candidate, interval),
  );
}

