import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];

export default function ViewScreen() {
  return (
    <Screen eyebrow="VIEW" title="日程">
      <View style={styles.segment}>
        <View style={styles.segmentActive}>
          <Text style={styles.segmentActiveText}>日程</Text>
        </View>
        <View style={styles.segmentItem}>
          <Text style={styles.segmentText}>统计</Text>
        </View>
      </View>
      <View style={styles.columns}>
        {['昨天', '今天'].map((day) => (
          <View key={day} style={styles.column}>
            <Text style={styles.columnTitle}>{day}</Text>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.hourRow}>
                <Text style={styles.hourText}>{hour}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  segmentItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  segmentActiveText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  columnTitle: {
    padding: spacing.md,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  hourRow: {
    flex: 1,
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.sm,
  },
  hourText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontVariant: ['tabular-nums'],
  },
});
