export type TimerMode = 'normal' | 'pomodoro';
export type TimerStatus = 'running' | 'paused' | 'awaiting-phase-confirmation';
export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';
export type TimeSliceKind = 'effective' | 'paused' | 'pomodoro-break';

export interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
}

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
  pomodoroConfig: PomodoroConfig | null;
}

export function elapsedForDisplay(timer: ActiveTimer, now: number) {
  const liveDelta = timer.status === 'running' ? Math.max(0, now - timer.phaseStartedAt) : 0;
  return timer.accumulatedEffectiveMs + timer.accumulatedPausedMs + liveDelta;
}

export function pomodoroPhaseDurationMs(timer: ActiveTimer) {
  if (!timer.pomodoroConfig || !timer.phase) return 0;
  const minutes =
    timer.phase === 'focus'
      ? timer.pomodoroConfig.focusMinutes
      : timer.phase === 'long-break'
        ? timer.pomodoroConfig.longBreakMinutes
        : timer.pomodoroConfig.shortBreakMinutes;
  return minutes * 60_000;
}

export function pomodoroRemainingMs(timer: ActiveTimer, now: number) {
  if (timer.mode !== 'pomodoro') return null;
  const elapsed = timer.status === 'paused' ? 0 : Math.max(0, now - timer.phaseStartedAt);
  return pomodoroPhaseDurationMs(timer) - elapsed;
}

export function nextPomodoroPhase(timer: ActiveTimer): PomodoroPhase {
  if (!timer.pomodoroConfig || timer.phase !== 'focus') return 'focus';
  return timer.round % timer.pomodoroConfig.longBreakEvery === 0 ? 'long-break' : 'short-break';
}
