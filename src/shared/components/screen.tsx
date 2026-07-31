import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/shared/theme/tokens';

type ScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  contentStyle?: ViewStyle;
  scrollEnabled?: boolean;
}>;

export function Screen({
  children,
  contentStyle,
  eyebrow,
  scrollEnabled = true,
  title,
}: ScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={scrollEnabled}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
});
