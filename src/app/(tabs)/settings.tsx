import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const SETTINGS = ['事件与分类', '计时与番茄钟', 'Apple 接入', '通知与外观', '数据与回收区', '关于'];

export default function SettingsScreen() {
  return (
    <Screen eyebrow="PREFERENCES" title="设置">
      <View style={styles.group}>
        {SETTINGS.map((item, index) => (
          <View key={item} style={[styles.row, index > 0 && styles.rowBorder]}>
            <Text style={styles.label}>{item}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </View>
      <Text style={styles.version}>工程骨架 · v0.1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 28,
  },
  version: {
    color: colors.textMuted,
    fontSize: typography.small,
    textAlign: 'center',
  },
});
