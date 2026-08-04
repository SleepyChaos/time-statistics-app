import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export default function IntegrationsScreen() {
  const router = useRouter();
  const [notificationStatus, setNotificationStatus] = useState('读取中');
  useEffect(() => {
    Notifications.getPermissionsAsync().then((result) => setNotificationStatus(result.granted ? '已允许' : '未允许'));
  }, []);
  return (
    <Screen eyebrow="APPLE" title="Apple 接入">
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ 返回设置</Text></Pressable>
      <IntegrationCard name="Apple 日历" status="本地模式" detail="当前 Windows 构建使用本地日程。迁移到 Mac 后连接 EventKit，支持读取、创建和调整可写日程。" />
      <IntegrationCard name="Apple 提醒事项" status="本地模式" detail="四个固定分类当前存储在本地。Mac 真机构建将绑定或自动创建四个提醒事项清单。" />
      <IntegrationCard name="系统通知" status={notificationStatus} detail="番茄钟只在获得权限后安排本地阶段提醒；拒绝权限不影响计时。" />
      <View style={styles.notice}><Text style={styles.noticeTitle}>迁移原则</Text><Text style={styles.detail}>权限恢复后由用户主动选择目标日历或清单；迁移成功前保留本地副本，不静默上传或移动事项。</Text></View>
    </Screen>
  );
}

function IntegrationCard({ detail, name, status }: { detail: string; name: string; status: string }) {
  return <View style={styles.card}><View style={styles.heading}><Text style={styles.name}>{name}</Text><Text style={styles.status}>{status}</Text></View><Text style={styles.detail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: typography.body },
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  heading: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, color: colors.text, fontSize: typography.heading, fontWeight: '700' },
  status: { color: colors.accent, fontSize: typography.small },
  detail: { color: colors.textSecondary, lineHeight: 22 },
  notice: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  noticeTitle: { color: colors.text, fontWeight: '700' },
});
