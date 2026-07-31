import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { ActiveTimer } from '@/domain/timer/active-timer';
import { elapsedForDisplay } from '@/domain/timer/active-timer';
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

  return <Text style={styles.value}>{formatDuration(elapsedForDisplay(timer, now))}</Text>;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

const styles = StyleSheet.create({
  value: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
});
