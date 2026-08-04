import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useHomeTimeline } from '@/features/timer/use-home-timeline';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS = SIX_HOURS * 2;

export function RollingTimeArc({
  children,
  disabled,
  now,
  onBackdateChange,
}: PropsWithChildren<{
  disabled: boolean;
  now: number;
  onBackdateChange: (startsAt: number | null) => void;
}>) {
  const timeline = useHomeTimeline(now);
  const [rewindMs, setRewindMs] = useState(0);
  const [resetTimer, setResetTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const selectedTime = now - rewindMs;
  const snapshot = timeline.data;

  const reset = useCallback(() => {
    setRewindMs(0);
    onBackdateChange(null);
  }, [onBackdateChange]);
  useEffect(() => () => {
    if (resetTimer) clearTimeout(resetTimer);
  }, [resetTimer]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dx) > 6,
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(0, Math.min(SIX_HOURS, rewindMs + gesture.dx * 60_000));
          setRewindMs(next);
          onBackdateChange(next > 0 ? now - next : null);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.max(0, Math.min(SIX_HOURS, rewindMs + gesture.dx * 60_000));
          setRewindMs(next);
          onBackdateChange(next > 0 ? now - next : null);
          if (resetTimer) clearTimeout(resetTimer);
          setResetTimer(next > 0 ? setTimeout(reset, 7_000) : null);
        },
      }),
    [disabled, now, onBackdateChange, reset, resetTimer, rewindMs],
  );

  return (
    <View accessibilityLabel="前后六小时时间弧，可向右拖动回溯" style={styles.shell} {...panResponder.panHandlers}>
      <View style={styles.band}>
        {snapshot?.slices.map((slice) => (
          <TimeBand
            key={slice.id}
            color={slice.kind === 'effective' ? slice.eventColorArgb : colors.border}
            endsAt={slice.endsAt}
            startsAt={slice.startsAt}
            windowStart={now - SIX_HOURS}
          />
        ))}
        {snapshot?.schedules.map((schedule) => (
          <TimeBand
            key={`schedule-${schedule.id}`}
            color={schedule.colorArgb}
            endsAt={schedule.endsAt}
            outline
            startsAt={schedule.startsAt}
            windowStart={now - SIX_HOURS}
          />
        ))}
        <View style={styles.nowMarker} />
      </View>
      <Text style={styles.edgeLeft}>−6h</Text>
      <Text style={styles.edgeRight}>＋6h</Text>
      <View style={styles.center}>{children}</View>
      {rewindMs > 0 ? (
        <Text style={styles.rewind}>
          回溯起点 {new Date(selectedTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          {' · '}7 秒内开始
        </Text>
      ) : null}
    </View>
  );
}

function TimeBand({
  color,
  endsAt,
  outline = false,
  startsAt,
  windowStart,
}: {
  color: string;
  endsAt: number;
  outline?: boolean;
  startsAt: number;
  windowStart: number;
}) {
  const left = Math.max(0, ((startsAt - windowStart) / TWELVE_HOURS) * 100);
  const right = Math.min(100, ((endsAt - windowStart) / TWELVE_HOURS) * 100);
  return (
    <View
      style={[
        styles.timeBand,
        {
          left: `${left}%`,
          width: `${Math.max(0.4, right - left)}%`,
          backgroundColor: outline ? 'transparent' : color,
          borderColor: color,
          borderWidth: outline ? 2 : 0,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', height: 164, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 240, borderTopRightRadius: 240, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.accentMuted, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, left: spacing.md, right: spacing.md, height: 16, borderRadius: radii.full, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  timeBand: { position: 'absolute', top: 2, bottom: 2, borderRadius: radii.full },
  nowMarker: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: colors.text },
  edgeLeft: { position: 'absolute', left: spacing.md, top: spacing.lg, color: colors.textMuted, fontSize: typography.small },
  edgeRight: { position: 'absolute', right: spacing.md, top: spacing.lg, color: colors.textMuted, fontSize: typography.small },
  center: { alignItems: 'center', justifyContent: 'center' },
  rewind: { position: 'absolute', bottom: spacing.sm, color: colors.accent, fontSize: typography.small },
});
