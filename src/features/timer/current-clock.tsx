import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/shared/theme/tokens';

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function CurrentClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  return <Text style={styles.clock}>{timeFormatter.format(now)}</Text>;
}

const styles = StyleSheet.create({
  clock: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
});
