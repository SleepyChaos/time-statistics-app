export type TimerMode = 'normal' | 'pomodoro';
export type TimerStatus = 'running' | 'paused' | 'awaiting-phase-confirmation';
export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';
export type TimeSliceKind = 'effective' | 'paused' | 'pomodoro-break';

export interface ActiveTimer {
  sessionId: string;
  recordId: string;
  sliceId: string;
  status: TimerStatus;
  mode: TimerMode;
  eventId: string;
  eventName: string;
  eventColorArgb: string;
  todoId: string | null;
  todoTitle: string | null;
  phase: PomodoroPhase | null;
  round: number;
  phaseStartedAt: number;
  accumulatedEffectiveMs: number;
  accumulatedPausedMs: number;
  lastPersistedAt: number;
  pendingEndAt: number | null;
}

export function elapsedForDisplay(timer: ActiveTimer, now: number) {
  const liveDelta = timer.status === 'running' ? Math.max(0, now - timer.phaseStartedAt) : 0;
  return timer.accumulatedEffectiveMs + timer.accumulatedPausedMs + liveDelta;
}
