import { defaultAppPreferences, pomodoroConfigSchema } from './app-settings';

describe('app settings validation', () => {
  it('accepts the default pomodoro configuration', () => {
    expect(pomodoroConfigSchema.parse(defaultAppPreferences.pomodoroConfig)).toEqual(
      defaultAppPreferences.pomodoroConfig,
    );
  });

  it('rejects zero-length phases and unreasonable round intervals', () => {
    expect(() =>
      pomodoroConfigSchema.parse({
        focusMinutes: 0,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 20,
      }),
    ).toThrow();
  });
});
