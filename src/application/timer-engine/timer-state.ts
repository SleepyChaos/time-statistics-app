export type TimerMode = 'normal' | 'pomodoro';
export type PomodoroPhase = 'focus' | 'short-break' | 'long-break';

export type TimerState =
  | { status: 'idle' }
  | {
      status: 'running';
      mode: TimerMode;
      eventId: string;
      phase: PomodoroPhase | null;
      phaseStartedAt: number;
    }
  | {
      status: 'paused';
      mode: TimerMode;
      eventId: string;
      phase: PomodoroPhase | null;
      pausedAt: number;
    }
  | {
      status: 'awaiting-phase-confirmation';
      eventId: string;
      phase: PomodoroPhase;
      phaseStartedAt: number;
    };

export type TimerCommand =
  | {
      type: 'start';
      mode: TimerMode;
      eventId: string;
      at: number;
    }
  | { type: 'pause'; at: number }
  | { type: 'resume'; at: number }
  | { type: 'phase-expired' }
  | { type: 'stop' };

export const initialTimerState: TimerState = { status: 'idle' };

export function transitionTimer(state: TimerState, command: TimerCommand): TimerState {
  switch (command.type) {
    case 'start':
      if (state.status !== 'idle') {
        throw new Error('TIMER_ALREADY_ACTIVE');
      }
      return {
        status: 'running',
        mode: command.mode,
        eventId: command.eventId,
        phase: command.mode === 'pomodoro' ? 'focus' : null,
        phaseStartedAt: command.at,
      };
    case 'pause':
      if (state.status !== 'running') {
        throw new Error('TIMER_NOT_RUNNING');
      }
      return {
        status: 'paused',
        mode: state.mode,
        eventId: state.eventId,
        phase: state.phase,
        pausedAt: command.at,
      };
    case 'resume':
      if (state.status !== 'paused') {
        throw new Error('TIMER_NOT_PAUSED');
      }
      return {
        status: 'running',
        mode: state.mode,
        eventId: state.eventId,
        phase: state.phase,
        phaseStartedAt: command.at,
      };
    case 'phase-expired':
      if (state.status !== 'running' || state.mode !== 'pomodoro' || state.phase === null) {
        throw new Error('POMODORO_NOT_RUNNING');
      }
      return {
        status: 'awaiting-phase-confirmation',
        eventId: state.eventId,
        phase: state.phase,
        phaseStartedAt: state.phaseStartedAt,
      };
    case 'stop':
      if (state.status === 'idle') {
        throw new Error('TIMER_NOT_ACTIVE');
      }
      return initialTimerState;
  }
}
