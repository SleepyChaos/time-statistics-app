import { initialTimerState, transitionTimer } from './timer-state';

describe('transitionTimer', () => {
  it('starts a normal timer from idle', () => {
    expect(
      transitionTimer(initialTimerState, {
        type: 'start',
        mode: 'normal',
        eventId: 'event-1',
        at: 1000,
      }),
    ).toEqual({
      status: 'running',
      mode: 'normal',
      eventId: 'event-1',
      phase: null,
      phaseStartedAt: 1000,
    });
  });

  it('rejects a second timer while one is active', () => {
    const running = transitionTimer(initialTimerState, {
      type: 'start',
      mode: 'normal',
      eventId: 'event-1',
      at: 1000,
    });

    expect(() =>
      transitionTimer(running, {
        type: 'start',
        mode: 'pomodoro',
        eventId: 'event-2',
        at: 2000,
      }),
    ).toThrow('TIMER_ALREADY_ACTIVE');
  });
});
