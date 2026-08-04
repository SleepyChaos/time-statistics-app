import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { AppPreferenceKey } from '@/domain/settings/app-settings';
import { useAppSettings } from '@/features/settings/use-app-settings';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

export default function PreferencesScreen() {
  const router = useRouter();
  const model = useAppSettings();
  const preferences = model.preferences;
  if (!preferences) return <Screen eyebrow="PREFERENCES" title="计时与通知"><Text style={styles.muted}>正在读取设置…</Text></Screen>;

  const toggle = (key: AppPreferenceKey, value: boolean) => model.setPreference({ key, value });
  const changePomodoro = (key: keyof typeof preferences.pomodoroConfig, delta: number) => {
    model.setPreference({
      key: 'pomodoroConfig',
      value: { ...preferences.pomodoroConfig, [key]: preferences.pomodoroConfig[key] + delta },
    });
  };

  return (
    <Screen eyebrow="PREFERENCES" title="计时、通知与外观">
      <BackButton onPress={() => router.back()} />
      <View style={styles.group}>
        <Text style={styles.groupTitle}>番茄钟默认值</Text>
        <Stepper label="专注" suffix="分钟" value={preferences.pomodoroConfig.focusMinutes} onChange={(delta) => changePomodoro('focusMinutes', delta)} />
        <Stepper label="短休息" suffix="分钟" value={preferences.pomodoroConfig.shortBreakMinutes} onChange={(delta) => changePomodoro('shortBreakMinutes', delta)} />
        <Stepper label="长休息" suffix="分钟" value={preferences.pomodoroConfig.longBreakMinutes} onChange={(delta) => changePomodoro('longBreakMinutes', delta)} />
        <Stepper label="长休息间隔" suffix="轮" value={preferences.pomodoroConfig.longBreakEvery} onChange={(delta) => changePomodoro('longBreakEvery', delta)} />
        <Text style={styles.note}>修改只影响之后新开始的番茄会话；进行中的会话保留启动时快照。</Text>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>提醒与设备</Text>
        <ToggleRow label="番茄阶段声音" value={preferences.pomodoroSound} onChange={(value) => toggle('pomodoroSound', value)} />
        <ToggleRow label="番茄阶段触觉" value={preferences.pomodoroHaptics} onChange={(value) => toggle('pomodoroHaptics', value)} />
        <ToggleRow label="保持屏幕常亮" value={preferences.keepAwake} onChange={(value) => toggle('keepAwake', value)} />
        <ToggleRow label="日程临期提醒" value={preferences.scheduleNotifications} onChange={(value) => toggle('scheduleNotifications', value)} />
        <ToggleRow label="待办临期提醒" value={preferences.todoNotifications} onChange={(value) => toggle('todoNotifications', value)} />
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            await Notifications.requestPermissionsAsync();
          }}
          style={styles.permissionButton}>
          <Text style={styles.permissionText}>请求系统通知权限</Text>
        </Pressable>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>无障碍</Text>
        <ToggleRow label="降低动态效果" value={preferences.reduceMotion} onChange={(value) => toggle('reduceMotion', value)} />
        <Text style={styles.note}>字体大小跟随 iOS 动态字体；关键状态同时使用文字、边线和颜色表达。</Text>
      </View>
      {model.error ? <Text style={styles.error}>设置保存失败，请重试。</Text> : null}
    </Screen>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress}><Text style={styles.back}>‹ 返回设置</Text></Pressable>;
}

function Stepper({ label, onChange, suffix, value }: { label: string; onChange: (delta: number) => void; suffix: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityLabel={`${label}减少`} accessibilityRole="button" onPress={() => onChange(-1)} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable>
      <Text style={styles.value}>{value} {suffix}</Text>
      <Pressable accessibilityLabel={`${label}增加`} accessibilityRole="button" onPress={() => onChange(1)} style={styles.step}><Text style={styles.stepText}>＋</Text></Pressable>
    </View>
  );
}

function ToggleRow({ label, onChange, value }: { label: string; onChange: (value: boolean) => void; value: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch accessibilityLabel={label} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.accentMuted }} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: typography.body },
  group: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  groupTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '700' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { flex: 1, color: colors.textSecondary },
  step: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, backgroundColor: colors.surfaceRaised },
  stepText: { color: colors.accent, fontSize: typography.heading },
  value: { minWidth: 72, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  note: { color: colors.textMuted, fontSize: typography.small, lineHeight: 18 },
  permissionButton: { alignItems: 'center', padding: spacing.md, borderRadius: radii.full, borderWidth: 1, borderColor: colors.accent },
  permissionText: { color: colors.accent, fontWeight: '700' },
  muted: { color: colors.textMuted },
  error: { color: colors.tomato, textAlign: 'center' },
});
