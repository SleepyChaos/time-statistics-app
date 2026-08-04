export const todoStages = ['habit', 'buffer', 'doing', 'future', 'unclassified'] as const;

export type TodoStage = (typeof todoStages)[number];

export interface TodoItem {
  id: string;
  source: 'local' | 'eventkit';
  externalId: string | null;
  externalListId: string | null;
  stage: TodoStage;
  title: string;
  dueAt: number | null;
  dueHasTime: boolean;
  isCompleted: boolean;
  recurrenceSnapshot: string | null;
  priority: number;
  eventId: string | null;
  eventName: string | null;
  createdAt: number;
  updatedAt: number;
}

export const todoStageLabels: Record<TodoStage, string> = {
  habit: '日常习惯',
  buffer: '待办缓冲区',
  doing: 'DOing 在做',
  future: '未来计划',
  unclassified: '未分类',
};

export function compareTodos(left: TodoItem, right: TodoItem) {
  if (left.dueAt === null && right.dueAt !== null) return 1;
  if (left.dueAt !== null && right.dueAt === null) return -1;
  if (left.dueAt !== null && right.dueAt !== null && left.dueAt !== right.dueAt) {
    return left.dueAt - right.dueAt;
  }
  return left.createdAt - right.createdAt;
}

export function recurrenceForTodoStage(
  stage: TodoStage,
  requested: 'daily' | 'weekly' | null = null,
) {
  const frequency = stage === 'habit' ? 'daily' : requested;
  return frequency ? JSON.stringify({ frequency, interval: 1 }) : null;
}
