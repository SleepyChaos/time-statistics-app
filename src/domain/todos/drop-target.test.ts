import { findTodoDropStage, type TodoDropTarget } from '@/domain/todos/drop-target';

const targets: TodoDropTarget[] = [
  { stage: 'habit', x: 0, y: 100, width: 60, height: 40 },
  { stage: 'buffer', x: 0, y: 150, width: 60, height: 40 },
];

describe('findTodoDropStage', () => {
  it('returns the category containing the release point', () => {
    expect(findTodoDropStage(targets, 30, 120)).toBe('habit');
    expect(findTodoDropStage(targets, 30, 170)).toBe('buffer');
  });

  it('returns null outside the category rail', () => {
    expect(findTodoDropStage(targets, 100, 120)).toBeNull();
  });
});
