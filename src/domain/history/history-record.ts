import type { TimeSliceKind, TimerMode } from '@/domain/timer/active-timer';
import { snapBackwardToFiveMinutes } from '@/domain/time/snap';

export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_BACKFILL_DURATION_MS = 15 * 60 * 1000;

export interface HistoryRecordDetail {
  recordId: string;
  sessionId: string;
  mode: TimerMode;
  eventId: string;
  eventName: string;
  eventColorArgb: string;
  todoTitle: string | null;
  startsAt: number;
  endsAt: number;
  totalMs: number;
  effectiveMs: number;
  pausedMs: number;
  reflection: string | null;
}

export interface TrashedRecord {
  recordId: string;
  eventName: string;
  eventColorArgb: string;
  startsAt: number;
  endsAt: number;
  deletedAt: number;
  expiresAt: number;
}

export interface BackfillDraft {
  startsAt: number;
  endsAt: number;
  eventId: string;
  eventName: string;
  eventColorArgb: string;
}

export interface EditableSlice {
  id: string;
  kind: TimeSliceKind;
  startsAt: number;
  endsAt: number;
}

export function trashExpiresAt(deletedAt: number) {
  return deletedAt + TRASH_RETENTION_MS;
}

export function buildBackfillRange(requestedAt: number, nextRecordStartsAt: number | null, now: number) {
  if (requestedAt >= now) throw new Error('BACKFILL_FUTURE_NOT_ALLOWED');
  const startsAt = snapBackwardToFiveMinutes(requestedAt);

  const endsAt = Math.min(
    startsAt + DEFAULT_BACKFILL_DURATION_MS,
    nextRecordStartsAt ?? Number.POSITIVE_INFINITY,
    now,
  );
  if (endsAt <= startsAt) throw new Error('NO_BACKFILL_SPACE');
  return { startsAt, endsAt };
}

export function cropSlicesToRange(
  slices: readonly EditableSlice[],
  startsAt: number,
  endsAt: number,
): EditableSlice[] {
  if (endsAt <= startsAt) throw new Error('INVALID_TIME_RANGE');
  if (slices.length === 0) throw new Error('RECORD_HAS_NO_SLICES');

  const cropped = slices.flatMap((slice) => {
    const clippedStart = Math.max(slice.startsAt, startsAt);
    const clippedEnd = Math.min(slice.endsAt, endsAt);
    return clippedEnd > clippedStart
      ? [{ ...slice, startsAt: clippedStart, endsAt: clippedEnd }]
      : [];
  });
  if (cropped.length === 0) {
    return [{ ...slices[0], startsAt, endsAt }];
  }
  cropped[0] = { ...cropped[0], startsAt };
  cropped[cropped.length - 1] = { ...cropped[cropped.length - 1], endsAt };
  return cropped;
}
