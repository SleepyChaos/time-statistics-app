import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppSettings } from '@/features/settings/use-app-settings';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const STEPS = [
  { title: '记录投入，不管理一切', body: '时间刻度只保留有限操作维度：选事件、开始、暂停、结束。日历与提醒事项仍由 Apple 生态承担。' },
  { title: '双弧选择，两种计时', body: '外层选分类，内层选事件；圆心两侧分别启动常规计时和番茄钟。计时中连续点击圆弧两次即可临时解锁切换。' },
  { title: '没有权限也能工作', body: '日历或提醒事项权限被拒绝时，基础日程和四类待办仍保存在本地。稍后可在设置中主动连接和迁移。' },
  { title: '随手补记与待办联动', body: '向右拖动首页时间弧可从过去开始；在待办页长按事项会回到首页并预选，是否启动哪种计时仍由你决定。' },
  { title: '先从一个事件开始', body: '应用已经内置基础分类与事件。你可以立即开始，也可以在首页“＋”或设置中建立自己的第一组分类和事件。' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const settings = useAppSettings();
  const [step, setStep] = useState(0);
  const complete = () => settings.setPreference(
    { key: 'onboardingCompleted', value: true },
    { onSuccess: () => router.replace('/timer') },
  );
  return (
    <Screen eyebrow={`WELCOME ${step + 1}/${STEPS.length}`} title={STEPS[step].title} contentStyle={styles.content}>
      <View style={styles.illustration} accessibilityLabel="功能示意">
        <View style={styles.outerArc}><View style={styles.innerArc}><Text style={styles.symbol}>{step === 0 ? '◎' : step === 1 ? '◒' : step === 2 ? '↔' : step === 3 ? '↶' : '＋'}</Text></View></View>
      </View>
      <Text style={styles.body}>{STEPS[step].body}</Text>
      <View style={styles.dots}>{STEPS.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}</View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => complete()} style={styles.skip}><Text style={styles.skipText}>跳过引导</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={settings.isMutating} onPress={() => step === STEPS.length - 1 ? complete() : setStep((value) => value + 1)} style={styles.next}><Text style={styles.nextText}>{step === STEPS.length - 1 ? '开始使用' : '继续'}</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  illustration: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  outerArc: { width: 260, height: 140, alignItems: 'center', justifyContent: 'flex-end', borderTopLeftRadius: 180, borderTopRightRadius: 180, borderWidth: 2, borderBottomWidth: 0, borderColor: colors.accent },
  innerArc: { width: 180, height: 96, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 120, borderTopRightRadius: 120, borderWidth: 2, borderBottomWidth: 0, borderColor: colors.tomato },
  symbol: { color: colors.text, fontSize: 56, fontWeight: '200' },
  body: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 27, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: radii.full, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', gap: spacing.md },
  skip: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, borderWidth: 1, borderColor: colors.border },
  skipText: { color: colors.textSecondary, fontWeight: '700' },
  next: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, backgroundColor: colors.accent },
  nextText: { color: '#FFFFFF', fontWeight: '700' },
});
