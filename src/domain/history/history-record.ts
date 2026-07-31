import type { TimerMode } from '@/domain/timer/active-timer';
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
