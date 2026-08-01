import type { TodoStage } from '@/domain/todos/todo';

export interface TodoDropTarget {
  stage: TodoStage;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function findTodoDropStage(
  targets: readonly TodoDropTarget[],
  absoluteX: number,
  absoluteY: number,
) {
  return (
    targets.find(
      (target) =>
        absoluteX >= target.x &&
        absoluteX <= target.x + target.width &&
        absoluteY >= target.y &&
        absoluteY <= target.y + target.height,
    )?.stage ?? null
  );
}
