import { Redirect } from 'expo-router';

import { useAppSettings } from '@/features/settings/use-app-settings';

export default function IndexScreen() {
  const settings = useAppSettings();
  if (settings.isLoading || !settings.preferences) return null;
  return <Redirect href={settings.preferences.onboardingCompleted ? '/timer' : '/onboarding'} />;
}
