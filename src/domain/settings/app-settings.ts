import { z } from 'zod';

export const pomodoroConfigSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  longBreakEvery: z.number().int().min(1).max(12),
});

export type PomodoroSettings = z.infer<typeof pomodoroConfigSchema>;

export interface AppPreferences {
  pomodoroConfig: PomodoroSettings;
  pomodoroSound: boolean;
  pomodoroHaptics: boolean;
  keepAwake: boolean;
  scheduleNotifications: boolean;
  todoNotifications: boolean;
  reduceMotion: boolean;
  onboardingCompleted: boolean;
}

export const defaultAppPreferences: AppPreferences = {
  pomodoroConfig: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
  },
  pomodoroSound: true,
  pomodoroHaptics: true,
  keepAwake: false,
  scheduleNotifications: false,
  todoNotifications: false,
  reduceMotion: false,
  onboardingCompleted: false,
};

export type AppPreferenceKey = keyof AppPreferences;
