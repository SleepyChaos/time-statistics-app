import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const CATEGORIES = ['全部', '习惯', '缓冲', 'DOing', '未来'];
const SAMPLE_TODOS = ['复习数据结构', '整理本周时间记录', '准备竞赛资料'];

export default function TodosScreen() {
  return (
    <Screen eyebrow="REMINDERS" title="待办事项" contentStyle={styles.content}>
      <View style={styles.categoryRail}>
        {CATEGORIES.map((category, index) => (
          <View key={category} style={[styles.category, index === 0 && styles.categoryActive]}>
            <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>
              {category}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.list}>
        <Text style={styles.groupTitle}>DOing 在做</Text>
        {SAMPLE_TODOS.map((todo) => (
          <View key={todo} style={styles.todo}>
            <View style={styles.checkbox} />
            <Text style={styles.todoTitle}>{todo}</Text>
          </View>
        ))}
        <View style={styles.addRow}>
          <Text style={styles.addText}>＋ 新增待办</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
  },
  categoryRail: {
    width: 66,
    gap: spacing.sm,
  },
  category: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  categoryActive: {
    backgroundColor: colors.accentMuted,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  categoryTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
  groupTitle: {
    color: colors.tomato,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  todoTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
  },
  addRow: {
    padding: spacing.md,
  },
  addText: {
    color: colors.accent,
    fontSize: typography.body,
  },
});
