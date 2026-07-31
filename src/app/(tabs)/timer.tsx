import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export default function TimerScreen() {
  return (
    <Screen eyebrow="NOW" title="时间刻度">
      <View style={styles.timeline}>
        <Text style={styles.timelineHint}>过去 6 小时</Text>
        <View style={styles.arc}>
          <Text style={styles.clock}>12:00</Text>
        </View>
        <Text style={styles.timelineHint}>未来 6 小时</Text>
      </View>

      <View style={styles.message}>
        <Text style={styles.messageText}>记录是为了看见，而不是为了控制。</Text>
      </View>

      <View style={styles.selector}>
        <Text style={styles.selectorLabel}>学习 · 计算机 408</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={[styles.button, styles.normalButton]}>
            <Text style={styles.buttonText}>常规计时</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.button, styles.pomodoroButton]}>
            <Text style={styles.buttonText}>番茄钟</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeline: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  arc: {
    width: '88%',
    height: 132,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
  selector: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  normalButton: {
    backgroundColor: colors.accent,
  },
  pomodoroButton: {
    backgroundColor: colors.tomato,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '700',
  },
});
