import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { ActiveTimer } from '@/domain/timer/active-timer';
import { elapsedForDisplay, pomodoroRemainingMs } from '@/domain/timer/active-timer';
import { colors } from '@/shared/theme/tokens';

export function ElapsedTime({ timer }: { timer: ActiveTimer }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== 'running') {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.status]);

  const duration =
    timer.mode === 'pomodoro'
      ? (pomodoroRemainingMs(timer, now) ?? 0)
      : elapsedForDisplay(timer, now);
  return <Text style={styles.value}>{formatDuration(duration)}</Text>;
}

function formatDuration(durationMs: number) {
  const sign = durationMs < 0 ? '−' : '';
  const totalSeconds = Math.floor(Math.abs(durationMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${sign}${[hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')}`;
}

const styles = StyleSheet.create({
  value: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
});
