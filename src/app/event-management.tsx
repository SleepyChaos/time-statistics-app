import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useEventManagement } from '@/features/events/use-event-management';
import { Screen } from '@/shared/components/screen';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const EVENT_COLORS = ['#7C83FF', '#42C6A5', '#FFB347', '#FF5A5F', '#5AA9E6'];

export default function EventManagementScreen() {
  const router = useRouter();
  const model = useEventManagement();
  const [categoryName, setCategoryName] = useState('');
  const [eventName, setEventName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
  const selectedCategory =
    model.categories.find((item) => item.id === selectedCategoryId && !item.deletedAt) ??
    model.categories.find((item) => !item.deletedAt) ??
    null;
  const groups = useMemo(
    () =>
      model.categories.map((category) => ({
        category,
        events: model.events.filter((event) => event.categoryId === category.id),
      })),
    [model.categories, model.events],
  );

  return (
    <Screen eyebrow="LIBRARY" title="事件与分类">
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>‹ 返回设置</Text>
      </Pressable>

      <View style={styles.composer}>
        <Text style={styles.sectionTitle}>新增分类</Text>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel="分类名称"
            onChangeText={setCategoryName}
            placeholder="例如：学习"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={categoryName}
          />
          <ActionButton
            disabled={!categoryName.trim() || model.isMutating}
            label="添加"
            onPress={() =>
              model.createCategory(
                { name: categoryName },
                { onSuccess: () => setCategoryName('') },
              )
            }
          />
        </View>
      </View>

      <View style={styles.composer}>
        <Text style={styles.sectionTitle}>新增具体事件</Text>
        <View style={styles.categoryPicker}>
          {model.categories
            .filter((item) => !item.deletedAt)
            .map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory?.id === category.id }}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.pill,
                  selectedCategory?.id === category.id && styles.pillSelected,
                ]}>
                <Text style={styles.pillText}>{category.name}</Text>
              </Pressable>
            ))}
        </View>
        <TextInput
          accessibilityLabel="事件名称"
          onChangeText={setEventName}
          placeholder="例如：计算机 408"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={eventName}
        />
        <View style={styles.colorRow}>
          {EVENT_COLORS.map((color) => (
            <Pressable
              key={color}
              accessibilityLabel={`事件颜色 ${color}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedColor === color }}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.color,
                { backgroundColor: color },
                selectedColor === color && styles.colorSelected,
              ]}
            />
          ))}
          <ActionButton
            disabled={!selectedCategory || !eventName.trim() || model.isMutating}
            label="添加事件"
            onPress={() =>
              selectedCategory &&
              model.createEvent(
                {
                  categoryId: selectedCategory.id,
                  name: eventName,
                  colorArgb: selectedColor,
                },
                { onSuccess: () => setEventName('') },
              )
            }
          />
        </View>
      </View>

      {model.error ? <Text style={styles.error}>操作失败，请检查名称和颜色。</Text> : null}
      {groups.map(({ category, events }) => (
        <View key={category.id} style={[styles.group, Boolean(category.deletedAt) && styles.deleted]}>
          <View style={styles.groupHeader}>
            <EditableName
              disabled={model.isMutating || Boolean(category.deletedAt)}
              onSave={(name) => model.updateCategory({ id: category.id, name })}
              style={styles.groupTitle}
              value={category.name}
            />
            <OrderButtons
              disabled={model.isMutating || Boolean(category.deletedAt)}
              onMove={(direction) => model.moveCategory({ id: category.id, direction })}
            />
            <Pressable
              accessibilityRole="button"
              disabled={model.isMutating}
              onPress={() => model.updateCategory({ id: category.id, deleted: !category.deletedAt })}>
              <Text style={category.deletedAt ? styles.restore : styles.remove}>
                {category.deletedAt ? '恢复分类' : '停用分类'}
              </Text>
            </Pressable>
          </View>
          {events.map((event) => (
            <View key={event.id} style={[styles.eventRow, Boolean(event.deletedAt) && styles.deleted]}>
              <View style={[styles.eventDot, { backgroundColor: event.colorArgb }]} />
              <EditableName
                disabled={model.isMutating || Boolean(event.deletedAt) || Boolean(category.deletedAt)}
                onSave={(name) => model.updateEvent({ id: event.id, name })}
                style={styles.eventName}
                value={event.name}
              />
              <Pressable
                accessibilityLabel="切换事件颜色"
                accessibilityRole="button"
                disabled={model.isMutating || Boolean(event.deletedAt) || Boolean(category.deletedAt)}
                onPress={() => {
                  const index = EVENT_COLORS.indexOf(event.colorArgb);
                  model.updateEvent({
                    id: event.id,
                    colorArgb: EVENT_COLORS[(index + 1) % EVENT_COLORS.length],
                  });
                }}>
                <Text style={styles.miniAction}>换色</Text>
              </Pressable>
              <OrderButtons
                disabled={model.isMutating || Boolean(event.deletedAt) || Boolean(category.deletedAt)}
                onMove={(direction) => model.moveEvent({ id: event.id, direction })}
              />
              <Pressable
                accessibilityRole="button"
                disabled={model.isMutating || Boolean(category.deletedAt)}
                onPress={() => model.updateEvent({ id: event.id, deleted: !event.deletedAt })}>
                <Text style={event.deletedAt ? styles.restore : styles.remove}>
                  {event.deletedAt ? '恢复' : '停用'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

function ActionButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.actionDisabled]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function EditableName({
  disabled,
  onSave,
  style,
  value,
}: {
  disabled: boolean;
  onSave: (name: string) => void;
  style: object;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <TextInput
      accessibilityLabel={`重命名 ${value}`}
      editable={!disabled}
      onChangeText={setDraft}
      onEndEditing={() => {
        const name = draft.trim();
        if (name && name !== value) onSave(name);
        if (!name) setDraft(value);
      }}
      style={[styles.inlineInput, style]}
      value={draft}
    />
  );
}

function OrderButtons({ disabled, onMove }: { disabled: boolean; onMove: (direction: -1 | 1) => void }) {
  return (
    <View style={styles.orderButtons}>
      <Pressable accessibilityLabel="向前排序" accessibilityRole="button" disabled={disabled} onPress={() => onMove(-1)}>
        <Text style={styles.miniAction}>↑</Text>
      </Pressable>
      <Pressable accessibilityLabel="向后排序" accessibilityRole="button" disabled={disabled} onPress={() => onMove(1)}>
        <Text style={styles.miniAction}>↓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: typography.body },
  composer: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: typography.body, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 44, color: colors.text, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  action: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.full, backgroundColor: colors.accent },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border },
  pillSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  pillText: { color: colors.textSecondary },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  color: { width: 30, height: 30, borderRadius: radii.full },
  colorSelected: { borderWidth: 3, borderColor: colors.text },
  group: { overflow: 'hidden', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  groupHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.surfaceRaised },
  groupTitle: { flex: 1, color: colors.text, fontSize: typography.body, fontWeight: '700' },
  eventRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  eventDot: { width: 10, height: 10, borderRadius: radii.full },
  eventName: { flex: 1, color: colors.textSecondary },
  inlineInput: { minHeight: 38, paddingVertical: 0 },
  orderButtons: { flexDirection: 'row', gap: spacing.sm },
  miniAction: { color: colors.accent, fontSize: typography.small, padding: spacing.xs },
  remove: { color: colors.tomato, fontSize: typography.small },
  restore: { color: colors.accent, fontSize: typography.small },
  deleted: { opacity: 0.48 },
  error: { color: colors.tomato, textAlign: 'center' },
});
