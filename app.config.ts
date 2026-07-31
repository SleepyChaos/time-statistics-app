import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: '时间刻度',
  slug: 'time-statistics-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'timeapp',
  userInterfaceStyle: 'automatic',
  platforms: ['ios'],
  ios: {
    bundleIdentifier: 'com.sleepychaos.timestatistics',
    buildNumber: '1',
    icon: './assets/expo.icon',
    supportsTablet: false,
    infoPlist: {
      NSCalendarsFullAccessUsageDescription:
        '用于读取和调整日程，并与实际计时记录进行对照统计。',
      NSRemindersFullAccessUsageDescription:
        '用于读取、创建和完成待办事项，并把投入时间关联到对应事项。',
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-notifications',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0D12',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
