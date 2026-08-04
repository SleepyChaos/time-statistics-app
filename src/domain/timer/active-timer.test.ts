import {
  nextPomodoroPhase,
  pomodoroRemainingMs,
  type ActiveTimer,
} from './active-timer';

const baseTimer: ActiveTimer = {
  sessionId: 'session',
  recordId: 'record',
  sliceId: 'slice',
  status: 'running',
  mode: 'pomodoro',
  eventId: 'event',
  eventName: '学习',
  eventColorArgb: '#7C83FF',
  todoId: null,
  todoTitle: null,
  phase: 'focus',
  round: 1,
  phaseStartedAt: 1_000,
  phaseElapsedMs: 0,
  accumulatedEffectiveMs: 0,
  accumulatedPausedMs: 0,
  lastPersistedAt: 1_000,
  pendingEndAt: null,
  pomodoroConfig: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
  },
};

describe('pomodoro display rules', () => {
  it('continues into a negative countdown while awaiting confirmation', () => {
    expect(pomodoroRemainingMs(baseTimer, 1_000 + 26 * 60_000)).toBe(-60_000);
  });

  it('chooses a short break after a regular focus round', () => {
    expect(nextPomodoroPhase(baseTimer)).toBe('short-break');
  });

  it('chooses a long break at the configured interval', () => {
    expect(nextPomodoroPhase({ ...baseTimer, round: 4 })).toBe('long-break');
  });

  it('returns to focus after either break', () => {
    expect(nextPomodoroPhase({ ...baseTimer, phase: 'short-break' })).toBe('focus');
  });

  it('keeps the current phase progress while paused', () => {
    expect(
      pomodoroRemainingMs(
        { ...baseTimer, status: 'paused', phaseElapsedMs: 10 * 60_000 },
        99_000_000,
      ),
    ).toBe(15 * 60_000);
  });
});
