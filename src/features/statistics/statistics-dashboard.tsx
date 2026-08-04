import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { statisticsPeriodMs, type StatisticsPeriod } from '@/domain/statistics/statistics';
import { useStatistics } from '@/features/statistics/use-statistics';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const PERIODS: { id: StatisticsPeriod; label: string }[] = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
];

export function StatisticsDashboard({ now }: { now: number }) {
  const [period, setPeriod] = useState<StatisticsPeriod>('week');
  const [endsAt, setEndsAt] = useState(now);
  const query = useStatistics(period, endsAt);
  const data = query.data;
  const duration = statisticsPeriodMs(period);
  const ratio = data?.utilization.ratio ?? 0;
  const comparison = ratio - (data?.previousUtilizationRatio ?? 0);

  const changePeriod = (next: StatisticsPeriod) => {
    setPeriod(next);
    setEndsAt(now);
  };

  return (
    <View style={styles.dashboard}>
      <View style={styles.periodPicker}>
        {PERIODS.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: period === item.id }}
            onPress={() => changePeriod(item.id)}
            style={[styles.periodButton, period === item.id && styles.periodSelected]}>
            <Text style={[styles.periodText, period === item.id && styles.periodTextSelected]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.windowBar}>
        <Pressable accessibilityLabel="上一统计窗口" accessibilityRole="button" onPress={() => setEndsAt((value) => value - duration)}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <View style={styles.windowLabel}>
          <Text style={styles.windowTitle}>{formatDate(endsAt - duration)} — {formatDate(endsAt)}</Text>
          <Text style={styles.windowHint}>以结束时刻为锚点的滚动窗口</Text>
        </View>
        <Pressable
          accessibilityLabel="下一统计窗口"
          accessibilityRole="button"
          disabled={endsAt >= now}
          onPress={() => setEndsAt((value) => Math.min(now, value + duration))}>
          <Text style={[styles.arrow, endsAt >= now && styles.disabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>合并后时间利用率</Text>
        <Text style={styles.ratio}>{Math.round(ratio * 100)}%</Text>
        <Text style={comparison >= 0 ? styles.positive : styles.negative}>
          较上一周期 {comparison >= 0 ? '＋' : ''}{Math.round(comparison * 100)} 个百分点
        </Text>
        <Text style={styles.hint}>有效 {formatDuration(data?.utilization.effectiveMs ?? 0)} / 已过去 {formatDuration(data?.utilization.elapsedMs ?? 0)}</Text>
      </View>

      <StatSection title="分类投入">
        {data?.categories.slice(0, 8).map((category) => (
          <BarRow key={category.categoryId} label={category.categoryName} value={category.effectiveMs} max={data.categories[0]?.effectiveMs ?? 1} />
        ))}
      </StatSection>

      <StatSection title="具体事件">
        {data?.events.slice(0, 10).map((event) => (
          <BarRow key={event.eventId} color={event.eventColorArgb} label={`${event.categoryName} → ${event.eventName}`} value={event.effectiveMs} max={data.events[0]?.effectiveMs ?? 1} />
        ))}
      </StatSection>

      <StatSection title="待办投入">
        {data?.todos.length ? data.todos.slice(0, 10).map((todo) => (
          <View key={todo.todoId} style={styles.todoRow}>
            <Text style={styles.todoTitle}>{todo.title || '已删除待办'}</Text>
            <Text style={styles.todoDuration}>{formatDuration(todo.effectiveMs)}</Text>
            <Text style={styles.todoMeta}>
              {todo.recordCount} 次 · 平均 {formatDuration(todo.averageEffectiveMs)}
              {'\n'}首次 {formatDateTime(todo.firstStartedAt)} · 最近 {formatDateTime(todo.lastStartedAt)}
            </Text>
          </View>
        )) : <Text style={styles.empty}>这个窗口还没有关联待办的计时。</Text>}
      </StatSection>
      {query.isLoading ? <Text style={styles.empty}>正在计算统计…</Text> : null}
      {query.error ? <Text style={styles.error}>统计读取失败，请稍后重试。</Text> : null}
    </View>
  );
}

function StatSection({ children, title }: { children: ReactNode; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function BarRow({ color = colors.accent, label, max, value }: { color?: string; label: string; max: number; value: number }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeading}><Text numberOfLines={1} style={styles.barLabel}>{label}</Text><Text style={styles.barValue}>{formatDuration(value)}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { backgroundColor: color, width: `${Math.max(2, (value / max) * 100)}%` }]} /></View>
    </View>
  );
}

function formatDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function formatDateTime(value: number) {
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  dashboard: { gap: spacing.md },
  periodPicker: { flexDirection: 'row', alignSelf: 'center', padding: 3, borderRadius: radii.full, backgroundColor: colors.surface },
  periodButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radii.full },
  periodSelected: { backgroundColor: colors.accentMuted },
  periodText: { color: colors.textMuted },
  periodTextSelected: { color: colors.text, fontWeight: '700' },
  windowBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface },
  arrow: { color: colors.accent, fontSize: 32, padding: spacing.sm },
  disabled: { opacity: 0.3 },
  windowLabel: { flex: 1, alignItems: 'center' },
  windowTitle: { color: colors.text, fontWeight: '700' },
  windowHint: { color: colors.textMuted, fontSize: typography.small },
  hero: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.surface },
  eyebrow: { color: colors.textMuted, fontSize: typography.caption },
  ratio: { color: colors.accent, fontSize: 60, fontWeight: '200', fontVariant: ['tabular-nums'] },
  positive: { color: '#42C6A5' },
  negative: { color: colors.tomato },
  hint: { color: colors.textSecondary, fontSize: typography.small },
  section: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '700' },
  barRow: { gap: spacing.xs },
  barHeading: { flexDirection: 'row', gap: spacing.md },
  barLabel: { flex: 1, color: colors.textSecondary },
  barValue: { color: colors.text, fontVariant: ['tabular-nums'] },
  track: { height: 6, overflow: 'hidden', borderRadius: radii.full, backgroundColor: colors.surfaceRaised },
  fill: { height: '100%', borderRadius: radii.full },
  todoRow: { gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  todoTitle: { color: colors.text, fontWeight: '700' },
  todoDuration: { color: colors.accent, fontSize: typography.heading, fontVariant: ['tabular-nums'] },
  todoMeta: { color: colors.textMuted, fontSize: typography.small, lineHeight: 18 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.tomato, textAlign: 'center' },
});
