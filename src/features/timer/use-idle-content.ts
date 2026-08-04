import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

interface ContentItem {
  id: string;
  kind: 'quote' | 'suggestion' | 'word';
  content: string;
  attribution: string | null;
}

export function useIdleContent(now: number) {
  const database = useSQLiteContext();
  const query = useQuery({
    queryKey: ['content-pool', 'enabled'],
    queryFn: () =>
      database.getAllAsync<ContentItem>(
        `SELECT id, kind, content, attribution FROM content_pool
         WHERE is_enabled = 1 ORDER BY sort_order, id`,
      ),
    staleTime: Infinity,
  });
  const items = query.data ?? [];
  return items.length > 0 ? items[Math.floor(now / 600_000) % items.length] : null;
}
