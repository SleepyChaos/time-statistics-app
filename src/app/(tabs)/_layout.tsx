import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { colors } from '@/shared/theme/tokens';

const TAB_ICON_SIZE = 21;

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="timer"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="timer"
        options={{
          title: '计时',
          tabBarIcon: ({ color }) => (
            <SymbolView name="timer" size={TAB_ICON_SIZE} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="view"
        options={{
          title: '视图',
          tabBarIcon: ({ color }) => (
            <SymbolView name="chart.xyaxis.line" size={TAB_ICON_SIZE} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: '待办',
          tabBarIcon: ({ color }) => (
            <SymbolView name="checklist" size={TAB_ICON_SIZE} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape" size={TAB_ICON_SIZE} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
