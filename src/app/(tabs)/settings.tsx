import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const SETTINGS = [
  { label: '事件与分类' },
  { label: '计时与番茄钟' },
  { label: 'Apple 接入' },
  { label: '通知与外观' },
  { label: '数据与回收区', route: '/recycle-bin' as const },
  { label: '关于' },
];

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <Screen eyebrow="PREFERENCES" title="设置">
      <View style={styles.group}>
        {SETTINGS.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            disabled={!item.route}
            onPress={() => item.route && router.push(item.route)}
            style={[styles.row, index > 0 && styles.rowBorder]}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.version}>本地优先 · v0.1.0</Text>
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
