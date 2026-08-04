import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDataSummary } from '@/features/settings/use-app-settings';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export default function DataSettingsScreen() {
  const router = useRouter();
  const summary = useDataSummary();
  return (
    <Screen eyebrow="LOCAL FIRST" title="数据与关于">
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ 返回设置</Text></Pressable>
      <View style={styles.card}>
        <Text style={styles.title}>本地数据概况</Text>
        <Metric label="计时记录" value={summary.data?.recordCount ?? 0} />
        <Metric label="日程" value={summary.data?.scheduleCount ?? 0} />
        <Metric label="待办" value={summary.data?.todoCount ?? 0} />
        <Text style={styles.detail}>最近保存：{summary.data?.lastSavedAt ? new Date(summary.data.lastSavedAt).toLocaleString('zh-CN') : '暂无记录'}</Text>
        <Text style={styles.detail}>数据保存在应用 SQLite 沙箱中；第一版不使用自建账号、云服务器或远程分析。</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/recycle-bin')} style={styles.action}><Text style={styles.actionText}>打开 7 天回收区</Text></Pressable>
      <View style={styles.card}><Text style={styles.title}>时间刻度 · v0.1.0</Text><Text style={styles.detail}>用于记录真实投入，而不是建立另一套复杂项目系统。日历和提醒事项标题、心得正文及精确时间默认不上传。</Text><Text style={styles.detail}>第一版不提供数据导出、内购或恢复购买；这些能力进入后续版本时将保持独立开关。</Text></View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.detail}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: typography.body },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: '700' },
  detail: { color: colors.textSecondary, lineHeight: 22 },
  metric: { flexDirection: 'row', alignItems: 'center' },
  value: { marginLeft: 'auto', color: colors.accent, fontSize: typography.heading, fontWeight: '700' },
  action: { alignItems: 'center', padding: spacing.lg, borderRadius: radii.full, backgroundColor: colors.accent },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
});
