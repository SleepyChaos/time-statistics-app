export interface TimeInterval {
  startsAt: number;
  endsAt: number;
}

export function assertValidInterval(interval: TimeInterval) {
  if (!Number.isFinite(interval.startsAt) || !Number.isFinite(interval.endsAt)) {
    throw new Error('INVALID_TIME_VALUE');
  }
  if (interval.endsAt <= interval.startsAt) {
    throw new Error('INVALID_TIME_RANGE');
  }
}

export function intervalsOverlap(left: TimeInterval, right: TimeInterval) {
  assertValidInterval(left);
  assertValidInterval(right);
  return left.startsAt < right.endsAt && left.endsAt > right.startsAt;
}

export function clipInterval(interval: TimeInterval, window: TimeInterval): TimeInterval | null {
  assertValidInterval(interval);
  assertValidInterval(window);

  const startsAt = Math.max(interval.startsAt, window.startsAt);
  const endsAt = Math.min(interval.endsAt, window.endsAt);
  return endsAt > startsAt ? { startsAt, endsAt } : null;
}

export function mergeIntervals(intervals: readonly TimeInterval[]) {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = intervals
    .map((interval) => {
      assertValidInterval(interval);
      return { ...interval };
    })
    .toSorted((left, right) => left.startsAt - right.startsAt || left.endsAt - right.endsAt);

  const merged: TimeInterval[] = [sorted[0]];
  for (let index = 1; index < sorted.length; index += 1) {
    const candidate = sorted[index];
    const previous = merged[merged.length - 1];
    if (candidate.startsAt <= previous.endsAt) {
      previous.endsAt = Math.max(previous.endsAt, candidate.endsAt);
    } else {
      merged.push(candidate);
    }
  }
  return merged;
}

export function sumIntervalDuration(intervals: readonly TimeInterval[]) {
  return mergeIntervals(intervals).reduce(
    (total, interval) => total + interval.endsAt - interval.startsAt,
    0,
  );
}

export function calculateUtilization(
  intervals: readonly TimeInterval[],
  window: TimeInterval,
  now: number,
) {
  assertValidInterval(window);
  const effectiveEnd = Math.min(Math.max(now, window.startsAt), window.endsAt);
  if (effectiveEnd <= window.startsAt) {
    return { effectiveMs: 0, elapsedMs: 0, ratio: 0 };
  }

  const elapsedWindow = { startsAt: window.startsAt, endsAt: effectiveEnd };
  const clipped = intervals
    .map((interval) => clipInterval(interval, elapsedWindow))
    .filter((interval): interval is TimeInterval => interval !== null);
  const effectiveMs = sumIntervalDuration(clipped);
  const elapsedMs = effectiveEnd - window.startsAt;

  return {
    effectiveMs,
    elapsedMs,
    ratio: effectiveMs / elapsedMs,
  };
}
