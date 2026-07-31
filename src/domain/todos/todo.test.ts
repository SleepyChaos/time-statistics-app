import { compareTodos, type TodoItem } from '@/domain/todos/todo';

function todo(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: 'todo',
    source: 'local',
    externalId: null,
    externalListId: null,
    stage: 'buffer',
    title: '事项',
    dueAt: null,
    dueHasTime: false,
    isCompleted: false,
    recurrenceSnapshot: null,
    priority: 0,
    eventId: null,
    eventName: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('compareTodos', () => {
  it('places dated items before undated items', () => {
    expect([todo({ id: 'undated' }), todo({ id: 'dated', dueAt: 10 })].sort(compareTodos)[0].id).toBe(
      'dated',
    );
  });

  it('orders equal-stage items by due time then creation time', () => {
    const items = [
      todo({ id: 'later', dueAt: 20 }),
      todo({ id: 'second', dueAt: 10, createdAt: 2 }),
      todo({ id: 'first', dueAt: 10, createdAt: 1 }),
    ];
    expect(items.sort(compareTodos).map((item) => item.id)).toEqual(['first', 'second', 'later']);
  });
});
