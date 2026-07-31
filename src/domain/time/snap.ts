export const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function snapForwardToFiveMinutes(timestamp: number) {
  assertFiniteTimestamp(timestamp);
  return Math.ceil(timestamp / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
}

export function snapBackwardToFiveMinutes(timestamp: number) {
  assertFiniteTimestamp(timestamp);
  return Math.floor(timestamp / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
}

export function snapInDragDirection(timestamp: number, direction: 'earlier' | 'later') {
  return direction === 'later'
    ? snapForwardToFiveMinutes(timestamp)
    : snapBackwardToFiveMinutes(timestamp);
}

export function stepByFiveMinutes(timestamp: number, direction: 'earlier' | 'later') {
  assertFiniteTimestamp(timestamp);
  const snapped =
    direction === 'later'
      ? snapForwardToFiveMinutes(timestamp)
      : snapBackwardToFiveMinutes(timestamp);
  if (snapped !== timestamp) return snapped;
  return timestamp + (direction === 'later' ? FIVE_MINUTES_MS : -FIVE_MINUTES_MS);
}

function assertFiniteTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp)) {
    throw new Error('INVALID_TIME_VALUE');
  }
}
