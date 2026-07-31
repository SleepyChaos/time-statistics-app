import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { initializeDatabase } from '@/infrastructure/database/initialize-database';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="time-statistics.db" onInit={initializeDatabase}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SQLiteProvider>
  );
}
