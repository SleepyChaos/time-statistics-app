import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/shared/providers/app-providers';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recycle-bin" />
          <Stack.Screen name="event-management" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="integrations" />
          <Stack.Screen name="data-settings" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
