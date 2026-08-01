import type { TimelineSchedule } from '@/domain/timeline/timeline';
import { buildScheduleDisplaySegments } from '@/domain/timeline/schedule-overlap';

const hour = 3_600_000;

function schedule(id: string, startsAt: number, endsAt: number): TimelineSchedule {
  return {
    id,
    source: 'local',
    title: id,
    startsAt,
    endsAt,
    isAllDay: false,
    colorArgb: '#6B67FF',
    isMarkedNotOccurred: false,
  };
}

describe('buildScheduleDisplaySegments', () => {
  it('keeps isolated schedules as independent segments', () => {
    const result = buildScheduleDisplaySegments(
      [schedule('a', 9 * hour, 10 * hour), schedule('b', 11 * hour, 12 * hour)],
      { startsAt: 0, endsAt: 24 * hour },
    );

    expect(result.map(({ startsAt, endsAt, primary }) => [startsAt, endsAt, primary.id])).toEqual([
      [9 * hour, 10 * hour, 'a'],
      [11 * hour, 12 * hour, 'b'],
    ]);
  });

  it('splits an overlap and keeps the first schedule as its primary color source', () => {
    const result = buildScheduleDisplaySegments(
      [schedule('b', 10 * hour, 12 * hour), schedule('a', 9 * hour, 11 * hour)],
      { startsAt: 0, endsAt: 24 * hour },
    );

    expect(
      result.map(({ startsAt, endsAt, primary, schedules }) => [
        startsAt,
        endsAt,
        primary.id,
        schedules.map(({ id }) => id),
      ]),
    ).toEqual([
      [9 * hour, 10 * hour, 'a', ['a']],
      [10 * hour, 11 * hour, 'a', ['a', 'b']],
      [11 * hour, 12 * hour, 'b', ['b']],
    ]);
  });

  it('clips schedules to the requested day window', () => {
    const result = buildScheduleDisplaySegments(
      [schedule('a', -hour, hour)],
      { startsAt: 0, endsAt: 24 * hour },
    );

    expect(result).toMatchObject([{ startsAt: 0, endsAt: hour }]);
  });
});
